-- Migration 023: production-safe manual payment ledger and report-card snapshots.
-- Additive and idempotent. Card payments and binary document storage remain disabled.

ALTER TABLE student_payments
    ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

UPDATE student_payments
SET paid_amount = CASE
    WHEN status = 'paid' THEN amount
    WHEN status = 'partial'
         AND COALESCE(metadata->>'amount_collected', '') ~ '^[0-9]+([.][0-9]{1,2})?$'
        THEN LEAST(amount, (metadata->>'amount_collected')::NUMERIC(12,2))
    ELSE LEAST(amount, GREATEST(paid_amount, 0))
END
WHERE paid_amount = 0 OR paid_amount > amount;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'student_payments'::regclass
          AND conname = 'student_payments_paid_amount_check'
    ) THEN
        ALTER TABLE student_payments
            ADD CONSTRAINT student_payments_paid_amount_check
            CHECK (paid_amount >= 0 AND paid_amount <= amount);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_payments_tenant_id
    ON student_payments(tenant_id, id);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    charge_id        UUID NOT NULL REFERENCES student_payments(id) ON DELETE RESTRICT,
    amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency         VARCHAR(3) NOT NULL,
    method           VARCHAR(20) NOT NULL CHECK (method IN ('cash','transfer','legacy')),
    reference        VARCHAR(255),
    notes            TEXT,
    idempotency_key  VARCHAR(120) NOT NULL,
    receipt_number   VARCHAR(100) NOT NULL,
    recorded_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, idempotency_key),
    UNIQUE (tenant_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_charge
    ON payment_transactions(tenant_id, charge_id, created_at DESC);

INSERT INTO payment_transactions (
    tenant_id, charge_id, amount, currency, method, reference, notes,
    idempotency_key, receipt_number, recorded_by, created_at
)
SELECT
    p.tenant_id,
    p.id,
    p.paid_amount,
    p.currency,
    'legacy',
    NULLIF(p.metadata->>'reference', ''),
    NULLIF(p.metadata->>'notes', ''),
    'legacy:' || p.id::text,
    COALESCE(NULLIF(p.receipt_number, ''), 'LEGACY-' || UPPER(RIGHT(REPLACE(p.id::text, '-', ''), 12))),
    p.created_by,
    COALESCE(p.paid_at, p.updated_at, p.created_at)
FROM student_payments p
WHERE p.paid_amount > 0
ON CONFLICT (tenant_id, idempotency_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS report_card_snapshots (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id       UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    period           VARCHAR(80) NOT NULL,
    payload_json     JSONB NOT NULL,
    payload_sha256   CHAR(64) NOT NULL,
    generated_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (payload_sha256 ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_report_card_snapshots_student
    ON report_card_snapshots(tenant_id, student_id, generated_at DESC);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_transactions_tenant_iso ON payment_transactions;
CREATE POLICY payment_transactions_tenant_iso ON payment_transactions
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

ALTER TABLE report_card_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS report_card_snapshots_tenant_iso ON report_card_snapshots;
CREATE POLICY report_card_snapshots_tenant_iso ON report_card_snapshots
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

CREATE OR REPLACE FUNCTION reject_append_only_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_transactions_append_only_update ON payment_transactions;
CREATE TRIGGER payment_transactions_append_only_update
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

DROP TRIGGER IF EXISTS payment_transactions_append_only_delete ON payment_transactions;
CREATE TRIGGER payment_transactions_append_only_delete
    BEFORE DELETE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

DROP TRIGGER IF EXISTS report_card_snapshots_append_only_update ON report_card_snapshots;
CREATE TRIGGER report_card_snapshots_append_only_update
    BEFORE UPDATE ON report_card_snapshots
    FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

DROP TRIGGER IF EXISTS report_card_snapshots_append_only_delete ON report_card_snapshots;
CREATE TRIGGER report_card_snapshots_append_only_delete
    BEFORE DELETE ON report_card_snapshots
    FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

-- Remove the insecure inline payloads created by the former base64 upload flow.
UPDATE school_documents
SET file_url = NULL,
    file_name = NULL,
    file_size = 0,
    mime_type = NULL,
    storage_status = 'physical_only',
    updated_at = NOW()
WHERE LOWER(COALESCE(file_url, '')) LIKE 'data:%';

UPDATE student_payments
SET receipt_url = NULL
WHERE receipt_url = '#' OR LOWER(COALESCE(receipt_url, '')) LIKE 'data:%';

-- Migration 015: production-safe manual payment ledger and report-card snapshots.
-- Additive and idempotent. Card payments and binary document storage remain disabled.

ALTER TABLE student_payments
    ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE student_payments
SET paid_amount = CASE
    WHEN status = 'paid' THEN amount
    WHEN status = 'partial' THEN LEAST(
        amount,
        COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.amount_collected')) AS DECIMAL(12,2)), 0)
    )
    ELSE LEAST(amount, GREATEST(paid_amount, 0))
END
WHERE paid_amount = 0 OR paid_amount > amount;

CREATE TABLE IF NOT EXISTS payment_transactions (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    tenant_id CHAR(36) NOT NULL,
    charge_id CHAR(36) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL,
    method VARCHAR(20) NOT NULL,
    reference VARCHAR(255) NULL,
    notes TEXT NULL,
    idempotency_key VARCHAR(120) NOT NULL,
    receipt_number VARCHAR(100) NOT NULL,
    recorded_by CHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_payment_transactions_idempotency (tenant_id, idempotency_key),
    UNIQUE KEY uq_payment_transactions_receipt (tenant_id, receipt_number),
    KEY idx_payment_transactions_charge (tenant_id, charge_id, created_at),
    CONSTRAINT chk_payment_transactions_amount CHECK (amount > 0),
    CONSTRAINT chk_payment_transactions_method CHECK (method IN ('cash','transfer','legacy')),
    CONSTRAINT fk_payment_transactions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_transactions_charge FOREIGN KEY (charge_id) REFERENCES student_payments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_transactions_user FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO payment_transactions (
    id, tenant_id, charge_id, amount, currency, method, reference, notes,
    idempotency_key, receipt_number, recorded_by, created_at
)
SELECT
    UUID(),
    p.tenant_id,
    p.id,
    p.paid_amount,
    p.currency,
    'legacy',
    NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p.metadata, '$.reference')), ''),
    COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p.metadata, '$.notes')), ''), p.notes),
    CONCAT('legacy:', p.id),
    COALESCE(NULLIF(p.receipt_number, ''), CONCAT('LEGACY-', UPPER(RIGHT(REPLACE(p.id, '-', ''), 12)))),
    COALESCE(p.registered_by, p.created_by),
    COALESCE(p.paid_at, p.updated_at, p.created_at)
FROM student_payments p
WHERE p.paid_amount > 0;

CREATE TABLE IF NOT EXISTS report_card_snapshots (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    tenant_id CHAR(36) NOT NULL,
    student_id CHAR(36) NOT NULL,
    period VARCHAR(80) NOT NULL,
    payload_json JSON NOT NULL,
    payload_sha256 CHAR(64) NOT NULL,
    generated_by CHAR(36) NULL,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_report_card_snapshots_student (tenant_id, student_id, generated_at),
    CONSTRAINT chk_report_card_snapshot_hash CHECK (payload_sha256 REGEXP '^[0-9a-f]{64}$'),
    CONSTRAINT fk_report_card_snapshot_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_report_card_snapshot_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    CONSTRAINT fk_report_card_snapshot_user FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS payment_transactions_append_only_update;
CREATE TRIGGER payment_transactions_append_only_update
BEFORE UPDATE ON payment_transactions FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'payment_transactions is append-only';

DROP TRIGGER IF EXISTS payment_transactions_append_only_delete;
CREATE TRIGGER payment_transactions_append_only_delete
BEFORE DELETE ON payment_transactions FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'payment_transactions is append-only';

DROP TRIGGER IF EXISTS report_card_snapshots_append_only_update;
CREATE TRIGGER report_card_snapshots_append_only_update
BEFORE UPDATE ON report_card_snapshots FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'report_card_snapshots is append-only';

DROP TRIGGER IF EXISTS report_card_snapshots_append_only_delete;
CREATE TRIGGER report_card_snapshots_append_only_delete
BEFORE DELETE ON report_card_snapshots FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'report_card_snapshots is append-only';

UPDATE school_documents
SET file_url = NULL,
    file_name = NULL,
    file_size = 0,
    mime_type = NULL,
    storage_status = 'physical_only',
    updated_at = CURRENT_TIMESTAMP
WHERE LOWER(COALESCE(file_url, '')) LIKE 'data:%';

UPDATE student_payments
SET receipt_url = NULL
WHERE receipt_url = '#' OR LOWER(COALESCE(receipt_url, '')) LIKE 'data:%';

-- Migration: 014_parent_teacher_portal_completion.sql
-- Completa flujos Padres/Profesores con documentos, pagos, consentimientos
-- y auditoria tenant-scoped sin crear modulos tenant-facing nuevos.

CREATE TABLE IF NOT EXISTS school_documents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id    UUID REFERENCES students(id) ON DELETE CASCADE,
    group_id      UUID REFERENCES groups(id) ON DELETE SET NULL,
    uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    category      VARCHAR(50) NOT NULL DEFAULT 'general'
                  CHECK (category IN ('general','homework','report_card','circular','medical','consent','receipt')),
    file_name     VARCHAR(255),
    file_url      TEXT,
    file_size     BIGINT NOT NULL DEFAULT 0,
    mime_type     VARCHAR(120),
    audience      VARCHAR(30) NOT NULL DEFAULT 'parents'
                  CHECK (audience IN ('parents','teachers','staff','all')),
    status        VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','archived','deleted')),
    metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_documents_tenant ON school_documents(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_documents_student ON school_documents(student_id, category);
CREATE INDEX IF NOT EXISTS idx_school_documents_group ON school_documents(group_id);

ALTER TABLE school_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_documents_tenant_iso ON school_documents;
CREATE POLICY school_documents_tenant_iso ON school_documents
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

CREATE TABLE IF NOT EXISTS student_payments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    concept        VARCHAR(255) NOT NULL,
    description    TEXT,
    amount         NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency       VARCHAR(3) NOT NULL DEFAULT 'MXN',
    due_date       DATE NOT NULL,
    paid_at        TIMESTAMPTZ,
    payment_method VARCHAR(50),
    receipt_number VARCHAR(100),
    receipt_url    TEXT,
    status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','paid','overdue','cancelled','partial')),
    created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_payments_tenant ON student_payments(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_student_payments_student ON student_payments(student_id, due_date DESC);

ALTER TABLE student_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_payments_tenant_iso ON student_payments;
CREATE POLICY student_payments_tenant_iso ON student_payments
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

CREATE TABLE IF NOT EXISTS parent_consents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    description   TEXT NOT NULL,
    category      VARCHAR(50) NOT NULL DEFAULT 'activity'
                  CHECK (category IN ('activity','medical','image_rights','transport','privacy','other')),
    due_date      DATE,
    status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','expired','cancelled')),
    signed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    signed_at     TIMESTAMPTZ,
    signature_ip  INET,
    notes         TEXT,
    metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_at    TIMESTAMPTZ,
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_consents_tenant ON parent_consents(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_parent_consents_student ON parent_consents(student_id, status);

ALTER TABLE parent_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS parent_consents_tenant_iso ON parent_consents;
CREATE POLICY parent_consents_tenant_iso ON parent_consents
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

CREATE TABLE IF NOT EXISTS parent_teacher_audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role  VARCHAR(30) NOT NULL,
    action      VARCHAR(100) NOT NULL,
    resource    VARCHAR(100) NOT NULL,
    resource_id UUID,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_teacher_audit_tenant ON parent_teacher_audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_teacher_audit_actor ON parent_teacher_audit_logs(actor_id, created_at DESC);

ALTER TABLE parent_teacher_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS parent_teacher_audit_tenant_iso ON parent_teacher_audit_logs;
CREATE POLICY parent_teacher_audit_tenant_iso ON parent_teacher_audit_logs
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

DROP TRIGGER IF EXISTS update_school_documents_updated_at ON school_documents;
CREATE TRIGGER update_school_documents_updated_at
    BEFORE UPDATE ON school_documents
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_payments_updated_at ON student_payments;
CREATE TRIGGER update_student_payments_updated_at
    BEFORE UPDATE ON student_payments
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_parent_consents_updated_at ON parent_consents;
CREATE TRIGGER update_parent_consents_updated_at
    BEFORE UPDATE ON parent_consents
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

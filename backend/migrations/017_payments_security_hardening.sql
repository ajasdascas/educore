-- Migration: 017_payments_security_hardening.sql
-- Endurece cobranza escolar: folios unicos y RLS sin fallback abierto.

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_payments_receipt_unique
    ON student_payments(receipt_number)
    WHERE receipt_number IS NOT NULL AND receipt_number <> '';

DROP POLICY IF EXISTS student_payments_tenant_iso ON student_payments;
CREATE POLICY student_payments_tenant_iso ON student_payments
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP POLICY IF EXISTS school_documents_tenant_iso ON school_documents;
CREATE POLICY school_documents_tenant_iso ON school_documents
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP POLICY IF EXISTS parent_consents_tenant_iso ON parent_consents;
CREATE POLICY parent_consents_tenant_iso ON parent_consents
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP POLICY IF EXISTS parent_teacher_audit_tenant_iso ON parent_teacher_audit_logs;
CREATE POLICY parent_teacher_audit_tenant_iso ON parent_teacher_audit_logs
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

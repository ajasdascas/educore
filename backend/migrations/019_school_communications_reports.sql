-- 019: School Communications and Reports tables

CREATE TABLE IF NOT EXISTS school_communications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    type            VARCHAR(50) NOT NULL DEFAULT 'announcement',
    priority        VARCHAR(20) NOT NULL DEFAULT 'normal',
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    recipient_type  VARCHAR(20) NOT NULL DEFAULT 'role',
    recipient_id    VARCHAR(100) NOT NULL DEFAULT 'parents',
    recipient_label VARCHAR(100) NOT NULL DEFAULT 'Padres',
    channels        JSON NOT NULL DEFAULT '["email"]',
    total_recipients INT NOT NULL DEFAULT 0,
    delivered_count INT NOT NULL DEFAULT 0,
    read_count      INT NOT NULL DEFAULT 0,
    created_by      UUID REFERENCES users(id),
    scheduled_for   TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_school_comm_tenant ON school_communications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_school_comm_status ON school_communications(tenant_id, status);

CREATE TABLE IF NOT EXISTS school_reports (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    type         VARCHAR(50) NOT NULL DEFAULT 'academic_summary',
    status       VARCHAR(20) NOT NULL DEFAULT 'pending',
    format       VARCHAR(20) NOT NULL DEFAULT 'pdf',
    group_id     VARCHAR(100),
    start_date   DATE NOT NULL,
    end_date     DATE NOT NULL,
    generated_by UUID REFERENCES users(id),
    summary      JSON NOT NULL DEFAULT '{}',
    insights     JSON NOT NULL DEFAULT '[]',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_school_reports_tenant ON school_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_school_reports_status ON school_reports(tenant_id, status);

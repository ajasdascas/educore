-- Database Admin Control Panel metadata
-- Non-destructive: stores UI/state/audit metadata for SuperAdmin database operations.

CREATE TABLE IF NOT EXISTS database_admin_table_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(128) NOT NULL UNIQUE,
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS database_admin_operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(120) NOT NULL,
    table_name VARCHAR(128),
    row_id UUID,
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_database_admin_table_states_table_name
    ON database_admin_table_states(table_name);

CREATE INDEX IF NOT EXISTS idx_database_admin_operation_logs_table_name
    ON database_admin_operation_logs(table_name);

CREATE INDEX IF NOT EXISTS idx_database_admin_operation_logs_created_at
    ON database_admin_operation_logs(created_at DESC);

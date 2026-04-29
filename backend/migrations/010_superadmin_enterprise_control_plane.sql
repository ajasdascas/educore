-- EduCore SuperAdmin Enterprise Control Plane.
-- Additive migration: SaaS operations, billing, health, support and feature flags.

ALTER TABLE modules_catalog
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS version VARCHAR(30) NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS required_level VARCHAR(50),
  ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS global_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE tenant_modules
  ADD COLUMN IF NOT EXISTS submodule_key VARCHAR(80),
  ADD COLUMN IF NOT EXISTS override_source VARCHAR(30),
  ADD COLUMN IF NOT EXISTS plan_key VARCHAR(80),
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS storage_limit_mb INTEGER NOT NULL DEFAULT 5120;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS storage_limit_mb INTEGER NOT NULL DEFAULT 5120,
  ADD COLUMN IF NOT EXISTS trial_days INTEGER NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20) NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS module_key VARCHAR(80),
  ADD COLUMN IF NOT EXISTS acting_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmation_text TEXT,
  ADD COLUMN IF NOT EXISTS request_id VARCHAR(120);

CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(120) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  category VARCHAR(40) NOT NULL DEFAULT 'general',
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  key VARCHAR(120) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS feature_flag_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key VARCHAR(120) NOT NULL REFERENCES feature_flags(key) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  level VARCHAR(50),
  plan VARCHAR(100),
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(flag_key, tenant_id, level, plan)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'trial',
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_students INTEGER NOT NULL DEFAULT 0,
  max_teachers INTEGER NOT NULL DEFAULT 0,
  storage_limit_mb INTEGER NOT NULL DEFAULT 5120,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 month',
  canceled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  folio VARCHAR(80) UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS manual_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
  method VARCHAR(40) NOT NULL DEFAULT 'transfer',
  reference VARCHAR(160),
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  title VARCHAR(220) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  module_key VARCHAR(80),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS support_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(40) NOT NULL,
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS storage_usage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  module_key VARCHAR(80),
  used_mb DECIMAL(12,2) NOT NULL DEFAULT 0,
  file_count INTEGER NOT NULL DEFAULT 0,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS module_health_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key VARCHAR(80) NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  status VARCHAR(30) NOT NULL DEFAULT 'healthy',
  message TEXT NOT NULL DEFAULT '',
  error_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS module_usage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key VARCHAR(80) NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  active_users INTEGER NOT NULL DEFAULT 0,
  event_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acting_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes',
  ip_address INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'full',
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  size_mb DECIMAL(12,2) NOT NULL DEFAULT 0,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(60) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'current',
  changelog TEXT NOT NULL DEFAULT '',
  deployed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS system_deploy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID REFERENCES system_versions(id) ON DELETE SET NULL,
  action VARCHAR(40) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  confirmation_text TEXT,
  logs TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status ON subscriptions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, priority);
CREATE INDEX IF NOT EXISTS idx_storage_usage_tenant ON storage_usage_snapshots(tenant_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_module_health_key ON module_health_events(module_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_module_usage_key ON module_usage_snapshots(module_key, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_active ON impersonation_sessions(acting_user_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_created ON backup_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_superadmin ON audit_logs(created_at DESC, module_key, severity);

INSERT INTO platform_settings (key, category, value) VALUES
  ('general', 'general', '{"platform_name":"EduCore","default_language":"es-MX","timezone":"America/Mexico_City","maintenance_mode":false}'::jsonb),
  ('security', 'security', '{"password_min_length":8,"session_timeout_minutes":120,"require_2fa":false,"max_sessions":5}'::jsonb),
  ('email', 'email', '{"provider":"manual","from_email":"soporte@educore.mx","templates_enabled":true}'::jsonb),
  ('api', 'api', '{"rate_limit_per_minute":120,"api_keys_enabled":false}'::jsonb),
  ('integrations', 'integrations', '{"twilio":false,"sendgrid":false,"stripe":false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage) VALUES
  ('superadmin_impersonation', 'Impersonation Mode', 'Permite al SuperAdmin entrar temporalmente como otro usuario con auditoria.', true, 100),
  ('health_monitor', 'Health Monitor', 'Monitoreo de salud por modulo.', true, 100),
  ('usage_scoring', 'Usage Scoring', 'Score de riesgo de churn por institucion.', true, 100)
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_versions (version, status, changelog)
SELECT '1.0.0-superadmin-enterprise', 'current', 'SuperAdmin Enterprise Control Plane inicial.'
WHERE NOT EXISTS (SELECT 1 FROM system_versions WHERE status = 'current');

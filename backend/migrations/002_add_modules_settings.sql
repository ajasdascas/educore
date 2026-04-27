-- EduCore MVP — Schema Update for educore_dev
-- Run this AFTER the initial 001_up.sql migration

-- Add missing tables and columns

-- modules_catalog (if not exists)
CREATE TABLE IF NOT EXISTS modules_catalog (
  key VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_core BOOLEAN DEFAULT FALSE,
  price_monthly_mxn DECIMAL(10,2) DEFAULT 0
);

INSERT INTO modules_catalog (key, name, is_core, price_monthly_mxn) VALUES
  ('academic_core', 'Académico Básico', TRUE, 0),
  ('parent_portal', 'Portal de Padres', TRUE, 0),
  ('teacher_portal', 'Portal de Profesores', TRUE, 0),
  ('communication', 'Mensajería y Comunicación', TRUE, 0),
  ('payments_basic', 'Pagos y Colegiaturas', TRUE, 0),
  ('cafeteria', 'Cafetería y Saldo Recargable', FALSE, 8),
  ('transport', 'Transporte Escolar', FALSE, 10),
  ('uniforms_store', 'Tienda de Uniformes', FALSE, 1500),
  ('events', 'Eventos y Talleres', FALSE, 500),
  ('qr_checkin', 'Check-in/out con QR', FALSE, 500),
  ('behavior', 'Reportes de Comportamiento', FALSE, 500),
  ('ai_reports', 'Reportes con IA', FALSE, 2000),
  ('cfdi', 'Facturación CFDI', FALSE, 1500)
ON CONFLICT (key) DO NOTHING;

-- school_settings (if not exists)
CREATE TABLE IF NOT EXISTS school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  school_year VARCHAR(20),
  periods JSONB DEFAULT '[]',
  grading_scale JSONB DEFAULT '{"min":0,"max":10,"passing":6}',
  primary_color VARCHAR(7) DEFAULT '#1A3C6E',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_settings_tenant_iso ON school_settings;
CREATE POLICY school_settings_tenant_iso ON school_settings
  USING (tenant_id = current_setting('app.current_tenant', TRUE)::UUID
         OR current_setting('app.current_tenant', TRUE) = '');

-- Add last_login_at to users if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Add invitation_expires_at alias
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ;

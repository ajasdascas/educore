-- EduCore modular core activation.
-- Additive migration: extends tenant_modules and seeds core module contracts.

ALTER TABLE tenant_modules
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS level VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE tenant_modules
SET enabled = is_active
WHERE enabled IS NULL;

ALTER TABLE tenant_modules
  ALTER COLUMN enabled SET DEFAULT true,
  ALTER COLUMN enabled SET NOT NULL;

INSERT INTO modules_catalog (key, name, description, is_core, price_monthly_mxn) VALUES
  ('users', 'Usuarios', 'Alumnos, padres, docentes y personal administrativo.', true, 0),
  ('students', 'Alumnos', 'Expedientes, inscripciones, padres vinculados e historial academico.', true, 0),
  ('attendance', 'Asistencias', 'Registro diario, asistencia por grupo y reportes mensuales.', true, 0),
  ('grades', 'Calificaciones', 'Captura de evaluaciones, promedios y boletas.', true, 0),
  ('reports', 'Reportes', 'Indicadores academicos, operativos y exportaciones.', true, 0),
  ('communications', 'Comunicaciones', 'Avisos, mensajes, notificaciones y comunicados.', true, 0),
  ('groups', 'Grupos', 'Organizacion de grupos, asignaciones y generaciones.', true, 0),
  ('schedules', 'Horarios', 'Constructor y visor de horarios por grupo, profesor y materia.', true, 0)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_core = EXCLUDED.is_core,
  price_monthly_mxn = EXCLUDED.price_monthly_mxn;

INSERT INTO tenant_modules (tenant_id, module_key, is_active, enabled, is_required, source, created_at, updated_at)
SELECT t.id, mc.key, true, true, true, 'core', NOW(), NOW()
FROM tenants t
CROSS JOIN modules_catalog mc
WHERE mc.is_core = true
ON CONFLICT (tenant_id, module_key)
DO UPDATE SET
  is_active = true,
  enabled = true,
  is_required = true,
  source = CASE WHEN tenant_modules.source = 'manual' THEN 'core' ELSE tenant_modules.source END,
  updated_at = NOW();

CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant_active
  ON tenant_modules (tenant_id, module_key)
  WHERE is_active = true;

ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_modules_tenant_iso ON tenant_modules;
CREATE POLICY tenant_modules_tenant_iso ON tenant_modules
  USING (NULLIF(current_setting('app.current_tenant', TRUE), '') IS NULL
         OR tenant_id = NULLIF(current_setting('app.current_tenant', TRUE), '')::UUID);

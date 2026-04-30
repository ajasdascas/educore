-- EduCore modular SaaS catalog and monetization alignment.
-- This migration does not create tenant-facing features; it classifies existing
-- capabilities so SuperAdmin can package, sell and gate them per tenant.

ALTER TABLE modules_catalog
  ADD COLUMN IF NOT EXISTS category VARCHAR(60) NOT NULL DEFAULT 'extension';

CREATE TABLE IF NOT EXISTS module_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(80) UNIQUE NOT NULL,
  name VARCHAR(140) NOT NULL,
  description TEXT,
  category VARCHAR(60) NOT NULL DEFAULT 'addon',
  price_monthly_mxn DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS module_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_key VARCHAR(80) NOT NULL REFERENCES module_packages(key) ON DELETE CASCADE,
  module_key VARCHAR(80) NOT NULL REFERENCES modules_catalog(key) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(package_key, module_key)
);

INSERT INTO modules_catalog
  (key, name, description, is_core, price_monthly_mxn, status, version, dependencies, global_enabled, metadata, category)
VALUES
  ('auth', 'Auth + Tenant + RBAC', 'Login, sesiones, roles, permisos y tenant context.', true, 0, 'active', '1.0.0', '[]'::jsonb, true, '{"layer":"core"}'::jsonb, 'core'),
  ('users', 'Usuarios', 'Personas unificadas: alumnos, padres, docentes y staff.', true, 0, 'active', '1.0.0', '["auth"]'::jsonb, true, '{"layer":"core"}'::jsonb, 'core'),
  ('academic_core', 'Academic Core', 'Ciclos, grados, grupos, materias, inscripciones e historial.', true, 0, 'active', '1.0.0', '["auth","users"]'::jsonb, true, '{"layer":"core"}'::jsonb, 'core'),
  ('grading', 'Grading System', 'Calificaciones, promedios, evaluaciones y comentarios.', true, 0, 'active', '1.0.0', '["academic_core"]'::jsonb, true, '{"layer":"core"}'::jsonb, 'core'),
  ('schedules', 'Horarios', 'Agenda semanal por grupo, profesor, salon y materia.', false, 249, 'active', '1.0.0', '["academic_core"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'academic_extension'),
  ('attendance', 'Asistencias', 'Registro rapido, ausencias, retardos y alertas.', false, 299, 'active', '1.0.0', '["academic_core"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'academic_extension'),
  ('documents', 'Expedientes digitales', 'PDF/JPG/PNG por alumno con preview y verificacion.', false, 349, 'active', '1.0.0', '["users"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'operations'),
  ('report_cards', 'Boletas', 'Preview y export de boletas con calificaciones y asistencia.', false, 299, 'active', '1.0.0', '["grading","attendance"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'grading_extension'),
  ('communications', 'Comunicaciones', 'Avisos, mensajes y notificaciones por segmento.', false, 249, 'active', '1.0.0', '["users"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'operations'),
  ('parent_portal', 'Portal de Padres', 'Hijos, asistencia, calificaciones, pagos, documentos y mensajes.', false, 399, 'active', '1.0.0', '["users","academic_core"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'portal'),
  ('teacher_portal', 'Portal de Profesores', 'Clases, asistencia, calificaciones y mensajes docentes.', false, 399, 'active', '1.0.0', '["users","academic_core"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'portal'),
  ('payments', 'Pagos y cobranza escolar', 'Adeudos, recibos, recordatorios y reportes de cobranza.', false, 499, 'active', '0.9.0', '["users"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'monetization'),
  ('qr_access', 'QR acceso y salida', 'Entrada, salida y pickup auditado por QR.', false, 449, 'planned', '0.8.0', '["users"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'operations'),
  ('credentials', 'Credenciales', 'Credenciales imprimibles con foto, logo y QR.', false, 299, 'planned', '0.8.0', '["users","qr_access"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'operations'),
  ('workshops', 'Talleres', 'Catalogo, inscripcion, horarios, asistencia y cobros de talleres.', false, 399, 'planned', '0.8.0', '["academic_core"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'academic_extension'),
  ('analytics', 'Analytics', 'Indicadores operativos, academic risk y uso por modulo.', false, 499, 'active', '0.9.0', '["academic_core"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'analytics'),
  ('database_admin', 'Database Admin', 'Herramienta interna SuperAdmin para inspeccion/export/import.', false, 0, 'active', '1.0.0', '[]'::jsonb, true, '{"layer":"internal","internal":true}'::jsonb, 'internal')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_core = EXCLUDED.is_core,
  price_monthly_mxn = EXCLUDED.price_monthly_mxn,
  status = EXCLUDED.status,
  version = EXCLUDED.version,
  dependencies = EXCLUDED.dependencies,
  global_enabled = EXCLUDED.global_enabled,
  metadata = modules_catalog.metadata || EXCLUDED.metadata,
  category = EXCLUDED.category,
  updated_at = NOW();

INSERT INTO module_packages (key, name, description, category, price_monthly_mxn, metadata)
VALUES
  ('core_basic', 'Core Basic', 'Base obligatoria para operar una escuela.', 'plan_bundle', 0, '{"plan":"basic"}'::jsonb),
  ('academic_pro', 'Academic Pro', 'Asistencia, horarios, expedientes, boletas y portales.', 'plan_bundle', 1199, '{"plan":"professional"}'::jsonb),
  ('operations_enterprise', 'Operations Enterprise', 'Pagos, QR, credenciales, talleres y analytics.', 'addon_bundle', 1699, '{"plan":"enterprise"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_monthly_mxn = EXCLUDED.price_monthly_mxn,
  metadata = EXCLUDED.metadata,
  updated_at = NOW(),
  deleted_at = NULL;

INSERT INTO module_package_items (package_key, module_key)
VALUES
  ('core_basic', 'auth'),
  ('core_basic', 'users'),
  ('core_basic', 'academic_core'),
  ('core_basic', 'grading'),
  ('academic_pro', 'schedules'),
  ('academic_pro', 'attendance'),
  ('academic_pro', 'documents'),
  ('academic_pro', 'report_cards'),
  ('academic_pro', 'communications'),
  ('academic_pro', 'parent_portal'),
  ('academic_pro', 'teacher_portal'),
  ('operations_enterprise', 'payments'),
  ('operations_enterprise', 'qr_access'),
  ('operations_enterprise', 'credentials'),
  ('operations_enterprise', 'workshops'),
  ('operations_enterprise', 'analytics')
ON CONFLICT (package_key, module_key) DO NOTHING;

UPDATE subscription_plans
SET modules = '["auth","users","academic_core","grading"]'::jsonb,
    features = '["Auth + RBAC","Usuarios y alumnos","Nucleo academico","Calificaciones base","Soporte por email"]'::jsonb,
    storage_limit_mb = COALESCE(storage_limit_mb, 5120),
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE subscription_plans
SET modules = '["auth","users","academic_core","grading","schedules","attendance","documents","report_cards","communications","parent_portal","teacher_portal"]'::jsonb,
    features = '["Todo Basic","Asistencia rapida","Horarios","Boletas","Expedientes digitales","Portal de padres"]'::jsonb,
    storage_limit_mb = COALESCE(storage_limit_mb, 10240),
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000002';

UPDATE subscription_plans
SET modules = '["auth","users","academic_core","grading","schedules","attendance","documents","report_cards","communications","parent_portal","teacher_portal","payments","qr_access","credentials","workshops","analytics"]'::jsonb,
    features = '["Alumnos ilimitados","Todos los modulos vendibles","SLA empresarial","Integraciones a medida","Acompanamiento dedicado"]'::jsonb,
    storage_limit_mb = COALESCE(storage_limit_mb, 51200),
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000003';


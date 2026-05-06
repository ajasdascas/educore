-- Migration 017: Level-specific module catalog expansion
-- Adds missing module keys (daily_logs, meals, naps, etc.) that are referenced by
-- modulesByEducationLevel in handler.go but were missing from modules_catalog,
-- causing FK constraint failures during CreateSchool for kinder/preescolar tenants.
-- Also adds submodule_catalog and level_module_templates tables.
-- Safe to run multiple times (idempotent throughout).
-- Run: mysql -h HOST -u USER -p DATABASE < backend/migrations_mysql/017_level_module_catalog_expansion.sql

-- ─── 1. Add missing module-level entries to modules_catalog ───────────────────
-- These keys are used in modulesByEducationLevel (Go) but were absent from catalog.
INSERT INTO modules_catalog (id, `key`, name, description, category, is_core, global_enabled, visible, supported_now, educational_level, plan_required, dependencies)
VALUES
  -- KINDER / BABIES level modules
  (UUID(), 'daily_logs',              'Registro diario',            'Alimentacion, siesta, higiene y estado del dia',      'kinder',      FALSE, TRUE, TRUE, TRUE, 'kinder',      'pro',        '[]'),
  (UUID(), 'meals',                   'Comidas',                    'Control de alimentacion diaria',                      'kinder',      FALSE, TRUE, TRUE, TRUE, 'kinder',      'pro',        '["daily_logs"]'),
  (UUID(), 'naps',                    'Siestas',                    'Control de siesta diaria',                            'kinder',      FALSE, TRUE, TRUE, TRUE, 'kinder',      'pro',        '["daily_logs"]'),
  (UUID(), 'diapers',                 'Higiene',                    'Control de pañal y aseo',                             'kinder',      FALSE, TRUE, TRUE, TRUE, 'kinder',      'pro',        '["daily_logs"]'),
  (UUID(), 'mood',                    'Estado de animo',            'Registro del estado emocional del alumno',            'kinder',      FALSE, TRUE, TRUE, TRUE, 'kinder',      'pro',        '["daily_logs"]'),
  (UUID(), 'health_checks',           'Salud y seguridad',          'Incidentes, medicamentos, alergias',                  'kinder',      FALSE, TRUE, TRUE, TRUE, 'kinder',      'pro',        '["academic_core"]'),
  (UUID(), 'incidents',               'Incidentes',                 'Registro de incidentes escolares',                    'extension',   FALSE, TRUE, TRUE, TRUE, NULL,          'pro',        '["academic_core"]'),
  (UUID(), 'pickup_authorizations',   'Autorizaciones de salida',   'Personas autorizadas para recoger al alumno',         'kinder',      FALSE, TRUE, TRUE, TRUE, 'kinder',      'pro',        '["students"]'),
  (UUID(), 'milestones',              'Hitos de desarrollo',        'Seguimiento de hitos del desarrollo infantil',        'kinder',      FALSE, TRUE, TRUE, TRUE, 'kinder',      'pro',        '["students"]'),
  (UUID(), 'photos_evidence',         'Fotos y evidencias',         'Galeria de fotos y evidencias del dia',               'extension',   FALSE, TRUE, TRUE, TRUE, NULL,          'pro',        '["academic_core"]'),
  -- PREESCOLAR level modules
  (UUID(), 'qualitative_assessments', 'Evaluacion cualitativa',     'Observaciones, rubricas y avances por campo',         'preescolar',  FALSE, TRUE, TRUE, TRUE, 'preescolar',  'pro',        '["academic_core"]'),
  (UUID(), 'development_areas',       'Campos formativos',          'Campos formativos y areas de desarrollo',             'preescolar',  FALSE, TRUE, TRUE, TRUE, 'preescolar',  'pro',        '["academic_core"]'),
  (UUID(), 'observations',            'Observaciones docentes',     'Registro de observaciones por alumno',                'extension',   FALSE, TRUE, TRUE, TRUE, NULL,          'pro',        '["academic_core"]'),
  (UUID(), 'activities',              'Actividades',                'Tareas, proyectos y actividades sencillas',           'extension',   FALSE, TRUE, TRUE, TRUE, NULL,          'pro',        '["academic_core"]'),
  (UUID(), 'behavior_notes',          'Notas de conducta',          'Seguimiento de comportamiento y conducta',            'extension',   FALSE, TRUE, TRUE, TRUE, NULL,          'pro',        '["academic_core"]'),
  (UUID(), 'preschool_report_cards',  'Boletas preescolar',         'Reportes cualitativos para padres',                   'preescolar',  FALSE, TRUE, TRUE, TRUE, 'preescolar',  'pro',        '["qualitative_assessments"]'),
  -- PRIMARIA level modules
  (UUID(), 'subjects',                'Materias',                   'Catalogo de materias por grado',                      'primaria',    FALSE, TRUE, TRUE, TRUE, 'primaria',    'pro',        '["academic_core"]'),
  (UUID(), 'assignments',             'Tareas',                     'Asignacion y revision de tareas',                     'primaria',    FALSE, TRUE, TRUE, TRUE, 'primaria',    'pro',        '["academic_core"]'),
  (UUID(), 'exams',                   'Examenes',                   'Creacion y aplicacion de examenes',                   'primaria',    FALSE, TRUE, TRUE, TRUE, 'primaria',    'pro',        '["grading"]'),
  (UUID(), 'classroom',               'Classroom',                  'Clases, materiales, tareas y entregas',               'primaria',    FALSE, TRUE, TRUE, TRUE, 'primaria',    'pro',        '["subjects","assignments"]'),
  (UUID(), 'library',                 'Biblioteca',                 'Catalogo, prestamos y devoluciones',                  'extension',   FALSE, TRUE, TRUE, TRUE, NULL,          'pro',        '["academic_core"]'),
  (UUID(), 'extracurriculars',        'Talleres',                   'Talleres y actividades extracurriculares',             'extension',   FALSE, TRUE, TRUE, FALSE, NULL,         'enterprise', '["academic_core"]'),
  (UUID(), 'school_store',            'Tienda escolar',             'Productos, inventario y pedidos',                     'extension',   FALSE, TRUE, TRUE, FALSE, NULL,         'enterprise', '["payments"]')
ON DUPLICATE KEY UPDATE
  name        = VALUES(name),
  description = VALUES(description),
  category    = VALUES(category),
  visible     = VALUES(visible),
  supported_now = VALUES(supported_now),
  educational_level = VALUES(educational_level),
  plan_required = VALUES(plan_required),
  updated_at  = CURRENT_TIMESTAMP;

-- ─── 2. Update educational_levels_catalog with display labels ─────────────────
INSERT INTO educational_levels_catalog (`key`, name, enabled, visible, supported_now, sort_order, notes)
VALUES
  ('kinder',     'Kinder / Estancia / Inicial', TRUE, TRUE, TRUE, 15, 'Cuidado y desarrollo infantil temprano'),
  ('preescolar', 'Preescolar',                  TRUE, TRUE, TRUE, 10, 'Educacion inicial con campos formativos'),
  ('primaria',   'Primaria',                    TRUE, TRUE, TRUE, 30, 'Educacion primaria con materias y calificaciones')
ON DUPLICATE KEY UPDATE
  name        = VALUES(name),
  enabled     = VALUES(enabled),
  visible     = VALUES(visible),
  supported_now = VALUES(supported_now),
  notes       = VALUES(notes),
  updated_at  = CURRENT_TIMESTAMP;

-- ─── 3. Create submodule_catalog ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submodule_catalog (
  id              CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  module_key      VARCHAR(80)  NOT NULL,
  submodule_key   VARCHAR(120) NOT NULL,
  name            VARCHAR(200) NOT NULL,
  description     TEXT         NULL,
  route           VARCHAR(500) NULL,
  allowed_roles   JSON         NOT NULL DEFAULT ('["SCHOOL_ADMIN","TEACHER","PARENT","STUDENT"]'),
  education_level VARCHAR(80)  NULL,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order      INT          NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_submodule (module_key, submodule_key),
  KEY idx_submodule_module (module_key),
  KEY idx_submodule_level  (education_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 4. Create level_module_templates ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS level_module_templates (
  id                   CHAR(36)    NOT NULL PRIMARY KEY DEFAULT (UUID()),
  education_level_code VARCHAR(80) NOT NULL,
  module_key           VARCHAR(80) NOT NULL,
  submodule_key        VARCHAR(120) NULL,
  is_required          TINYINT(1)  NOT NULL DEFAULT 0,
  is_default_enabled   TINYINT(1)  NOT NULL DEFAULT 1,
  allowed_roles        JSON        NOT NULL DEFAULT ('["SCHOOL_ADMIN","TEACHER","PARENT","STUDENT"]'),
  created_at           DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_level_module_template (education_level_code, module_key, submodule_key),
  KEY idx_lmt_level   (education_level_code),
  KEY idx_lmt_module  (module_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. Seed level_module_templates — KINDER ─────────────────────────────────
INSERT INTO level_module_templates (id, education_level_code, module_key, submodule_key, is_required, is_default_enabled, allowed_roles)
VALUES
  -- Core base
  (UUID(), 'kinder', 'academic_core',        NULL, 1, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'kinder', 'users',                NULL, 1, 1, '["SCHOOL_ADMIN"]'),
  (UUID(), 'kinder', 'students',             NULL, 1, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  -- Alumnos pequeños
  (UUID(), 'kinder', 'students',             'expediente_infantil',       0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'kinder', 'students',             'tutores',                   0, 1, '["SCHOOL_ADMIN"]'),
  (UUID(), 'kinder', 'pickup_authorizations','autorizados_recoger',       0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  (UUID(), 'kinder', 'health_checks',        'alergias',                  0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  (UUID(), 'kinder', 'health_checks',        'indicaciones_medicas',      0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  -- Asistencia / Entrada / Salida
  (UUID(), 'kinder', 'attendance',           'checkin',                   0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'kinder', 'attendance',           'checkout',                  0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'kinder', 'attendance',           'persona_recoge',            0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  (UUID(), 'kinder', 'attendance',           'retardos',                  0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'kinder', 'attendance',           'historial_diario',          0, 1, '["SCHOOL_ADMIN","PARENT"]'),
  -- Reporte diario
  (UUID(), 'kinder', 'daily_logs',           NULL,                        0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  (UUID(), 'kinder', 'meals',                NULL,                        0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  (UUID(), 'kinder', 'naps',                 NULL,                        0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  (UUID(), 'kinder', 'diapers',              NULL,                        0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  (UUID(), 'kinder', 'mood',                 NULL,                        0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  (UUID(), 'kinder', 'photos_evidence',      NULL,                        0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  -- Salud y seguridad
  (UUID(), 'kinder', 'health_checks',        NULL,                        0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'kinder', 'incidents',            NULL,                        0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'kinder', 'milestones',           NULL,                        0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  -- Comunicacion
  (UUID(), 'kinder', 'communications',       NULL,                        0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  -- Finanzas
  (UUID(), 'kinder', 'payments',             NULL,                        0, 0, '["SCHOOL_ADMIN","PARENT"]'),
  (UUID(), 'kinder', 'documents',            NULL,                        0, 1, '["SCHOOL_ADMIN","PARENT"]'),
  -- Grupos / Salas
  (UUID(), 'kinder', 'groups',               NULL,                        0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'kinder', 'schedules',            NULL,                        0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  -- Reportes
  (UUID(), 'kinder', 'reports',              NULL,                        0, 1, '["SCHOOL_ADMIN"]')
ON DUPLICATE KEY UPDATE is_default_enabled = VALUES(is_default_enabled), allowed_roles = VALUES(allowed_roles), updated_at = CURRENT_TIMESTAMP;

-- ─── 6. Seed level_module_templates — PREESCOLAR ──────────────────────────────
INSERT INTO level_module_templates (id, education_level_code, module_key, submodule_key, is_required, is_default_enabled, allowed_roles)
VALUES
  (UUID(), 'preescolar', 'academic_core',            NULL,                       1, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'preescolar', 'users',                    NULL,                       1, 1, '["SCHOOL_ADMIN"]'),
  (UUID(), 'preescolar', 'students',                 NULL,                       1, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'preescolar', 'groups',                   NULL,                       1, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  -- Asistencia
  (UUID(), 'preescolar', 'attendance',               NULL,                       0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  (UUID(), 'preescolar', 'attendance',               'pase_lista',               0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'preescolar', 'attendance',               'retardos',                 0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'preescolar', 'attendance',               'justificantes',            0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  (UUID(), 'preescolar', 'attendance',               'reporte_mensual',          0, 1, '["SCHOOL_ADMIN","PARENT"]'),
  -- Campos formativos
  (UUID(), 'preescolar', 'development_areas',        NULL,                       0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'preescolar', 'development_areas',        'lenguajes',                0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'preescolar', 'development_areas',        'saberes_pensamiento',      0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'preescolar', 'development_areas',        'etica_naturaleza',         0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'preescolar', 'development_areas',        'humano_comunitario',       0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  -- Evaluacion cualitativa
  (UUID(), 'preescolar', 'qualitative_assessments',  NULL,                       0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  (UUID(), 'preescolar', 'qualitative_assessments',  'observaciones',            0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'preescolar', 'qualitative_assessments',  'rubricas',                 0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'preescolar', 'qualitative_assessments',  'avances_campo',            0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  (UUID(), 'preescolar', 'qualitative_assessments',  'reporte_padres',           0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  -- Boleta preescolar
  (UUID(), 'preescolar', 'preschool_report_cards',   NULL,                       0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  -- Actividades
  (UUID(), 'preescolar', 'activities',               NULL,                       0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT","STUDENT"]'),
  (UUID(), 'preescolar', 'observations',             NULL,                       0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'preescolar', 'behavior_notes',           NULL,                       0, 0, '["SCHOOL_ADMIN","TEACHER"]'),
  -- Comunicacion
  (UUID(), 'preescolar', 'communications',           NULL,                       0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  -- Horarios y documentos
  (UUID(), 'preescolar', 'schedules',                NULL,                       0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  (UUID(), 'preescolar', 'documents',                NULL,                       0, 1, '["SCHOOL_ADMIN","PARENT"]'),
  -- Finanzas
  (UUID(), 'preescolar', 'payments',                 NULL,                       0, 0, '["SCHOOL_ADMIN","PARENT"]'),
  -- Reportes
  (UUID(), 'preescolar', 'reports',                  NULL,                       0, 1, '["SCHOOL_ADMIN"]')
ON DUPLICATE KEY UPDATE is_default_enabled = VALUES(is_default_enabled), allowed_roles = VALUES(allowed_roles), updated_at = CURRENT_TIMESTAMP;

-- ─── 7. Seed level_module_templates — PRIMARIA ────────────────────────────────
INSERT INTO level_module_templates (id, education_level_code, module_key, submodule_key, is_required, is_default_enabled, allowed_roles)
VALUES
  (UUID(), 'primaria', 'academic_core',   NULL,                    1, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'primaria', 'users',           NULL,                    1, 1, '["SCHOOL_ADMIN"]'),
  (UUID(), 'primaria', 'students',        NULL,                    1, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'primaria', 'groups',          NULL,                    1, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  -- Materias
  (UUID(), 'primaria', 'subjects',        NULL,                    0, 1, '["SCHOOL_ADMIN","TEACHER","STUDENT"]'),
  (UUID(), 'primaria', 'subjects',        'espanol_lenguajes',     0, 1, '["SCHOOL_ADMIN","TEACHER","STUDENT"]'),
  (UUID(), 'primaria', 'subjects',        'matematicas',           0, 1, '["SCHOOL_ADMIN","TEACHER","STUDENT"]'),
  (UUID(), 'primaria', 'subjects',        'ciencias',              0, 1, '["SCHOOL_ADMIN","TEACHER","STUDENT"]'),
  (UUID(), 'primaria', 'subjects',        'historia',              0, 1, '["SCHOOL_ADMIN","TEACHER","STUDENT"]'),
  (UUID(), 'primaria', 'subjects',        'geografia',             0, 1, '["SCHOOL_ADMIN","TEACHER","STUDENT"]'),
  (UUID(), 'primaria', 'subjects',        'ingles',                0, 1, '["SCHOOL_ADMIN","TEACHER","STUDENT"]'),
  (UUID(), 'primaria', 'subjects',        'artes',                 0, 1, '["SCHOOL_ADMIN","TEACHER","STUDENT"]'),
  (UUID(), 'primaria', 'subjects',        'educacion_fisica',      0, 1, '["SCHOOL_ADMIN","TEACHER","STUDENT"]'),
  -- Horarios
  (UUID(), 'primaria', 'schedules',       NULL,                    0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT","STUDENT"]'),
  -- Asistencia
  (UUID(), 'primaria', 'attendance',      NULL,                    0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT","STUDENT"]'),
  (UUID(), 'primaria', 'attendance',      'pase_lista',            0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'primaria', 'attendance',      'retardos',              0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'primaria', 'attendance',      'justificadas',          0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT"]'),
  (UUID(), 'primaria', 'attendance',      'reporte_grupo',         0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'primaria', 'attendance',      'reporte_alumno',        0, 1, '["SCHOOL_ADMIN","PARENT"]'),
  -- Calificaciones
  (UUID(), 'primaria', 'grading',         NULL,                    0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'primaria', 'grades',          NULL,                    0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT","STUDENT"]'),
  (UUID(), 'primaria', 'grading',         'captura_calificaciones',0, 1, '["TEACHER"]'),
  (UUID(), 'primaria', 'grading',         'rubricas',              0, 1, '["SCHOOL_ADMIN","TEACHER"]'),
  (UUID(), 'primaria', 'grading',         'promedios',             0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT","STUDENT"]'),
  -- Boletas
  (UUID(), 'primaria', 'report_cards',    NULL,                    0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT","STUDENT"]'),
  -- Classroom / Tareas
  (UUID(), 'primaria', 'assignments',     NULL,                    0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT","STUDENT"]'),
  (UUID(), 'primaria', 'classroom',       NULL,                    0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT","STUDENT"]'),
  (UUID(), 'primaria', 'classroom',       'clases',                0, 1, '["TEACHER","STUDENT"]'),
  (UUID(), 'primaria', 'classroom',       'tareas',                0, 1, '["TEACHER","PARENT","STUDENT"]'),
  (UUID(), 'primaria', 'classroom',       'materiales',            0, 1, '["TEACHER","STUDENT"]'),
  (UUID(), 'primaria', 'classroom',       'entregas',              0, 1, '["TEACHER","STUDENT"]'),
  (UUID(), 'primaria', 'classroom',       'comentarios',           0, 1, '["TEACHER","STUDENT","PARENT"]'),
  -- Examenes
  (UUID(), 'primaria', 'exams',           NULL,                    0, 1, '["SCHOOL_ADMIN","TEACHER","STUDENT"]'),
  (UUID(), 'primaria', 'exams',           'crear_examen',          0, 1, '["TEACHER"]'),
  (UUID(), 'primaria', 'exams',           'banco_preguntas',       0, 1, '["TEACHER"]'),
  (UUID(), 'primaria', 'exams',           'resultados',            0, 1, '["TEACHER","PARENT","STUDENT"]'),
  -- Comunicacion
  (UUID(), 'primaria', 'communications',  NULL,                    0, 1, '["SCHOOL_ADMIN","TEACHER","PARENT","STUDENT"]'),
  -- Documentos
  (UUID(), 'primaria', 'documents',       NULL,                    0, 1, '["SCHOOL_ADMIN","PARENT","STUDENT"]'),
  (UUID(), 'primaria', 'documents',       'constancias',           0, 1, '["SCHOOL_ADMIN"]'),
  (UUID(), 'primaria', 'documents',       'boletas',               0, 1, '["SCHOOL_ADMIN","PARENT","STUDENT"]'),
  (UUID(), 'primaria', 'documents',       'credenciales',          0, 0, '["SCHOOL_ADMIN"]'),
  -- Finanzas
  (UUID(), 'primaria', 'payments',        NULL,                    0, 1, '["SCHOOL_ADMIN","PARENT"]'),
  (UUID(), 'primaria', 'payments',        'colegiaturas',          0, 1, '["SCHOOL_ADMIN","PARENT"]'),
  (UUID(), 'primaria', 'payments',        'estado_cuenta',         0, 1, '["SCHOOL_ADMIN","PARENT","STUDENT"]'),
  -- Reportes
  (UUID(), 'primaria', 'reports',         NULL,                    0, 1, '["SCHOOL_ADMIN"]'),
  -- Biblioteca
  (UUID(), 'primaria', 'library',         NULL,                    0, 0, '["SCHOOL_ADMIN","TEACHER","STUDENT"]')
ON DUPLICATE KEY UPDATE is_default_enabled = VALUES(is_default_enabled), allowed_roles = VALUES(allowed_roles), updated_at = CURRENT_TIMESTAMP;

-- ─── 8. Seed submodule_catalog — KINDER ───────────────────────────────────────
INSERT INTO submodule_catalog (id, module_key, submodule_key, name, description, route, allowed_roles, education_level, sort_order)
VALUES
  (UUID(), 'students',             'expediente_infantil',    'Expediente infantil',      'Datos del niño',                         '/school-admin/students',     '["SCHOOL_ADMIN","TEACHER"]',         'kinder', 1),
  (UUID(), 'students',             'tutores',                'Tutores',                  'Padres y tutores',                       '/school-admin/students',     '["SCHOOL_ADMIN"]',                   'kinder', 2),
  (UUID(), 'pickup_authorizations','autorizados_recoger',    'Autorizados para recoger', 'Personas autorizadas para salida',       '/school-admin/pickup',       '["SCHOOL_ADMIN","TEACHER","PARENT"]','kinder', 1),
  (UUID(), 'health_checks',        'alergias',               'Alergias',                 'Alergias y reacciones',                  '/school-admin/health',       '["SCHOOL_ADMIN","TEACHER","PARENT"]','kinder', 1),
  (UUID(), 'health_checks',        'indicaciones_medicas',   'Indicaciones medicas',     'Medicamentos y protocolos',              '/school-admin/health',       '["SCHOOL_ADMIN","TEACHER"]',         'kinder', 2),
  (UUID(), 'attendance',           'checkin',                'Check-in',                 'Registro de entrada',                    '/school-admin/attendance',   '["SCHOOL_ADMIN","TEACHER"]',         'kinder', 1),
  (UUID(), 'attendance',           'checkout',               'Check-out',                'Registro de salida',                     '/school-admin/attendance',   '["SCHOOL_ADMIN","TEACHER"]',         'kinder', 2),
  (UUID(), 'attendance',           'persona_recoge',         'Persona que recoge',       'Quien recoge al alumno',                 '/school-admin/attendance',   '["SCHOOL_ADMIN","TEACHER","PARENT"]','kinder', 3),
  (UUID(), 'attendance',           'retardos',               'Retardos',                 'Llegadas tarde',                         '/school-admin/attendance',   '["SCHOOL_ADMIN","TEACHER"]',         'kinder', 4),
  (UUID(), 'attendance',           'historial_diario',       'Historial diario',         'Historial de entradas y salidas',        '/school-admin/attendance',   '["SCHOOL_ADMIN","PARENT"]',          'kinder', 5),
  (UUID(), 'daily_logs',           'alimentacion',           'Alimentacion',             'Registro de comidas del dia',            '/school-admin/daily-logs',   '["SCHOOL_ADMIN","TEACHER","PARENT"]','kinder', 1),
  (UUID(), 'daily_logs',           'siesta',                 'Siesta',                   'Registro de siesta',                     '/school-admin/naps',         '["SCHOOL_ADMIN","TEACHER","PARENT"]','kinder', 2),
  (UUID(), 'daily_logs',           'higiene',                'Higiene',                  'Control de pañal y aseo',                '/school-admin/diapers',      '["SCHOOL_ADMIN","TEACHER","PARENT"]','kinder', 3),
  (UUID(), 'daily_logs',           'estado_animo',           'Estado de animo',          'Registro emocional del dia',             '/school-admin/mood',         '["SCHOOL_ADMIN","TEACHER","PARENT"]','kinder', 4),
  (UUID(), 'daily_logs',           'actividades_dia',        'Actividades del dia',      'Actividades realizadas',                 '/school-admin/daily-logs',   '["SCHOOL_ADMIN","TEACHER","PARENT"]','kinder', 5),
  (UUID(), 'daily_logs',           'fotos_evidencias',       'Fotos y evidencias',       'Galeria del dia',                        '/school-admin/photos',       '["SCHOOL_ADMIN","TEACHER","PARENT"]','kinder', 6),
  (UUID(), 'incidents',            'incidentes',             'Incidentes',               'Registro de incidentes',                 '/school-admin/incidents',    '["SCHOOL_ADMIN","TEACHER"]',         'kinder', 1),
  (UUID(), 'milestones',           'hitos_desarrollo',       'Hitos de desarrollo',      'Seguimiento de hitos',                   '/school-admin/milestones',   '["SCHOOL_ADMIN","TEACHER","PARENT"]','kinder', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), allowed_roles = VALUES(allowed_roles), updated_at = CURRENT_TIMESTAMP;

-- ─── 9. Seed submodule_catalog — PREESCOLAR ───────────────────────────────────
INSERT INTO submodule_catalog (id, module_key, submodule_key, name, description, route, allowed_roles, education_level, sort_order)
VALUES
  (UUID(), 'development_areas',       'lenguajes',              'Lenguajes',               'Campo formativo: Lenguajes',             '/school-admin/development', '["SCHOOL_ADMIN","TEACHER"]',         'preescolar', 1),
  (UUID(), 'development_areas',       'saberes_pensamiento',    'Saberes y Pensamiento',   'Saberes y pensamiento cientifico',       '/school-admin/development', '["SCHOOL_ADMIN","TEACHER"]',         'preescolar', 2),
  (UUID(), 'development_areas',       'etica_naturaleza',       'Etica y Naturaleza',      'Etica, Naturaleza y Sociedades',         '/school-admin/development', '["SCHOOL_ADMIN","TEACHER"]',         'preescolar', 3),
  (UUID(), 'development_areas',       'humano_comunitario',     'Humano y Comunitario',    'De lo Humano y lo Comunitario',          '/school-admin/development', '["SCHOOL_ADMIN","TEACHER"]',         'preescolar', 4),
  (UUID(), 'qualitative_assessments', 'observaciones',          'Observaciones',           'Observaciones por alumno',               '/school-admin/qualitative', '["SCHOOL_ADMIN","TEACHER"]',         'preescolar', 1),
  (UUID(), 'qualitative_assessments', 'rubricas',               'Rubricas',                'Rubricas de evaluacion',                 '/school-admin/qualitative', '["SCHOOL_ADMIN","TEACHER"]',         'preescolar', 2),
  (UUID(), 'qualitative_assessments', 'avances_campo',          'Avances por campo',       'Progreso por campo formativo',           '/school-admin/qualitative', '["SCHOOL_ADMIN","TEACHER","PARENT"]','preescolar', 3),
  (UUID(), 'qualitative_assessments', 'reporte_padres',         'Reporte para padres',     'Informe cualitativo para familia',       '/school-admin/qualitative', '["SCHOOL_ADMIN","TEACHER","PARENT"]','preescolar', 4),
  (UUID(), 'attendance',              'pase_lista',             'Pase de lista',           'Registro de asistencia diaria',          '/school-admin/attendance',  '["SCHOOL_ADMIN","TEACHER"]',         'preescolar', 1),
  (UUID(), 'attendance',              'retardos',               'Retardos',                'Llegadas tarde',                         '/school-admin/attendance',  '["SCHOOL_ADMIN","TEACHER"]',         'preescolar', 2),
  (UUID(), 'attendance',              'justificantes',          'Justificantes',           'Justificacion de faltas',                '/school-admin/attendance',  '["SCHOOL_ADMIN","TEACHER","PARENT"]','preescolar', 3),
  (UUID(), 'attendance',              'reporte_mensual',        'Reporte mensual',         'Reporte mensual de asistencias',         '/school-admin/attendance',  '["SCHOOL_ADMIN","PARENT"]',          'preescolar', 4)
ON DUPLICATE KEY UPDATE name = VALUES(name), allowed_roles = VALUES(allowed_roles), updated_at = CURRENT_TIMESTAMP;

-- ─── 10. Seed submodule_catalog — PRIMARIA ────────────────────────────────────
INSERT INTO submodule_catalog (id, module_key, submodule_key, name, description, route, allowed_roles, education_level, sort_order)
VALUES
  (UUID(), 'subjects',    'espanol_lenguajes',    'Español / Lenguajes',   'Materia: Español',              '/school-admin/academic', '["SCHOOL_ADMIN","TEACHER","STUDENT"]','primaria', 1),
  (UUID(), 'subjects',    'matematicas',          'Matematicas',           'Materia: Matematicas',           '/school-admin/academic', '["SCHOOL_ADMIN","TEACHER","STUDENT"]','primaria', 2),
  (UUID(), 'subjects',    'ciencias',             'Ciencias',              'Materia: Ciencias Naturales',    '/school-admin/academic', '["SCHOOL_ADMIN","TEACHER","STUDENT"]','primaria', 3),
  (UUID(), 'subjects',    'historia',             'Historia',              'Materia: Historia',              '/school-admin/academic', '["SCHOOL_ADMIN","TEACHER","STUDENT"]','primaria', 4),
  (UUID(), 'subjects',    'geografia',            'Geografia',             'Materia: Geografia',             '/school-admin/academic', '["SCHOOL_ADMIN","TEACHER","STUDENT"]','primaria', 5),
  (UUID(), 'subjects',    'ingles',               'Ingles',                'Materia: Ingles',                '/school-admin/academic', '["SCHOOL_ADMIN","TEACHER","STUDENT"]','primaria', 6),
  (UUID(), 'subjects',    'artes',                'Artes',                 'Materia: Artes',                 '/school-admin/academic', '["SCHOOL_ADMIN","TEACHER","STUDENT"]','primaria', 7),
  (UUID(), 'subjects',    'educacion_fisica',     'Educacion Fisica',      'Materia: Educacion Fisica',      '/school-admin/academic', '["SCHOOL_ADMIN","TEACHER","STUDENT"]','primaria', 8),
  (UUID(), 'classroom',   'clases',               'Clases',                'Sesiones de clase',              '/school-admin/classroom','["TEACHER","STUDENT"]',              'primaria', 1),
  (UUID(), 'classroom',   'tareas',               'Tareas',                'Asignacion de tareas',           '/school-admin/classroom','["TEACHER","PARENT","STUDENT"]',     'primaria', 2),
  (UUID(), 'classroom',   'materiales',           'Materiales',            'Recursos de clase',              '/school-admin/classroom','["TEACHER","STUDENT"]',              'primaria', 3),
  (UUID(), 'classroom',   'entregas',             'Entregas',              'Entrega de tareas',              '/school-admin/classroom','["TEACHER","STUDENT"]',              'primaria', 4),
  (UUID(), 'grading',     'captura_calificaciones','Captura calificaciones','Captura de notas',              '/school-admin/grades',   '["TEACHER"]',                        'primaria', 1),
  (UUID(), 'grading',     'rubricas',             'Rubricas',              'Evaluacion por rubrica',         '/school-admin/grades',   '["SCHOOL_ADMIN","TEACHER"]',         'primaria', 2),
  (UUID(), 'grading',     'promedios',            'Promedios',             'Calculo de promedios',           '/school-admin/grades',   '["SCHOOL_ADMIN","TEACHER","PARENT","STUDENT"]','primaria', 3),
  (UUID(), 'exams',       'crear_examen',         'Crear examen',          'Diseño de examenes',             '/school-admin/exams',    '["TEACHER"]',                        'primaria', 1),
  (UUID(), 'exams',       'banco_preguntas',      'Banco de preguntas',    'Repositorio de preguntas',       '/school-admin/exams',    '["TEACHER"]',                        'primaria', 2),
  (UUID(), 'exams',       'resultados',           'Resultados',            'Ver resultados de examenes',     '/school-admin/exams',    '["TEACHER","PARENT","STUDENT"]',     'primaria', 3),
  (UUID(), 'attendance',  'pase_lista',           'Pase de lista',         'Asistencia diaria',              '/school-admin/attendance','["SCHOOL_ADMIN","TEACHER"]',        'primaria', 1),
  (UUID(), 'attendance',  'retardos',             'Retardos',              'Llegadas tarde',                 '/school-admin/attendance','["SCHOOL_ADMIN","TEACHER"]',        'primaria', 2),
  (UUID(), 'attendance',  'justificadas',         'Faltas justificadas',   'Justificacion de ausencias',     '/school-admin/attendance','["SCHOOL_ADMIN","TEACHER","PARENT"]','primaria', 3),
  (UUID(), 'attendance',  'reporte_grupo',        'Reporte por grupo',     'Asistencia por grupo',           '/school-admin/attendance','["SCHOOL_ADMIN","TEACHER"]',        'primaria', 4),
  (UUID(), 'attendance',  'reporte_alumno',       'Reporte por alumno',    'Asistencia individual',          '/school-admin/attendance','["SCHOOL_ADMIN","PARENT"]',         'primaria', 5),
  (UUID(), 'documents',   'constancias',          'Constancias',           'Constancias de estudio',         '/school-admin/documents','["SCHOOL_ADMIN"]',                   'primaria', 1),
  (UUID(), 'documents',   'boletas',              'Boletas',               'Boletas de calificaciones',      '/school-admin/documents','["SCHOOL_ADMIN","PARENT","STUDENT"]','primaria', 2),
  (UUID(), 'documents',   'credenciales',         'Credenciales',          'Credenciales escolares',         '/school-admin/documents','["SCHOOL_ADMIN"]',                   'primaria', 3),
  (UUID(), 'payments',    'colegiaturas',         'Colegiaturas',          'Pagos de colegiatura',           '/school-admin/payments', '["SCHOOL_ADMIN","PARENT"]',          'primaria', 1),
  (UUID(), 'payments',    'estado_cuenta',        'Estado de cuenta',      'Saldo y adeudos',                '/school-admin/payments', '["SCHOOL_ADMIN","PARENT","STUDENT"]','primaria', 2)
ON DUPLICATE KEY UPDATE name = VALUES(name), allowed_roles = VALUES(allowed_roles), updated_at = CURRENT_TIMESTAMP;

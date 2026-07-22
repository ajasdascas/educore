-- Production readiness gate.
--
-- A module may be sold or provisioned only after it has a real tenant route,
-- persistence contract, authorization guard and automated coverage. This
-- migration deliberately disables historical/demo keys instead of leaving
-- tenants with navigation that ends in a placeholder, synthetic data or 404.

WITH ready(module_key) AS (
  VALUES
    ('auth'), ('users'), ('academic_core'), ('grading'), ('students'),
    ('groups'), ('grades'), ('schedules'), ('attendance')
)
UPDATE modules_catalog AS mc
SET status = 'active',
    global_enabled = true,
    metadata = COALESCE(mc.metadata, '{}'::jsonb) || jsonb_build_object(
      'production_ready', true,
      'readiness_gate', '2026-07-21'
    ),
    updated_at = NOW()
FROM ready
WHERE mc.key = ready.module_key;

WITH blocked(module_key) AS (
  VALUES
    ('documents'), ('report_cards'), ('reports'), ('communications'),
    ('communication'), ('payments'), ('payments_basic'), ('parent_portal'),
    ('teacher_portal'), ('analytics'), ('database_admin'), ('qr_access'),
    ('credentials'), ('workshops'), ('portal_school_admin'), ('portal_parents'),
    ('portal_teachers'), ('portal_students'), ('daily_logs'), ('meals'), ('naps'),
    ('diapers'), ('mood'), ('health_checks'), ('incidents'),
    ('pickup_authorizations'), ('milestones'), ('photos_evidence'),
    ('qualitative_assessments'), ('development_areas'), ('observations'),
    ('activities'), ('behavior_notes'), ('preschool_report_cards'),
    ('subjects'), ('assignments'), ('exams')
)
UPDATE modules_catalog AS mc
SET status = CASE WHEN mc.status = 'planned' THEN 'planned' ELSE 'readiness_blocked' END,
    global_enabled = false,
    metadata = COALESCE(mc.metadata, '{}'::jsonb) || jsonb_build_object(
      'production_ready', false,
      'readiness_gate', '2026-07-21',
      'readiness_reason', 'Requires a complete production contract and automated tests'
    ),
    updated_at = NOW()
FROM blocked
WHERE mc.key = blocked.module_key;

UPDATE modules_catalog
SET is_core = false, updated_at = NOW()
WHERE key IN ('reports', 'communications');

-- Horarios y asistencias son extensiones seleccionables. Versiones anteriores
-- de la provisión también las marcaban como obligatorias por nivel, lo que
-- hacía imposible desactivarlas aunque la interfaz las vendiera como extras.
UPDATE tenant_modules
SET is_required = false,
    source = CASE WHEN source = 'level' THEN 'readiness_migration' ELSE source END,
    updated_at = NOW()
WHERE module_key IN ('schedules', 'attendance');

WITH blocked(module_key) AS (
  VALUES
    ('documents'), ('report_cards'), ('reports'), ('communications'),
    ('communication'), ('payments'), ('payments_basic'), ('parent_portal'),
    ('teacher_portal'), ('analytics'), ('database_admin'), ('qr_access'),
    ('credentials'), ('workshops'), ('portal_school_admin'), ('portal_parents'),
    ('portal_teachers'), ('portal_students'), ('daily_logs'), ('meals'), ('naps'),
    ('diapers'), ('mood'), ('health_checks'), ('incidents'),
    ('pickup_authorizations'), ('milestones'), ('photos_evidence'),
    ('qualitative_assessments'), ('development_areas'), ('observations'),
    ('activities'), ('behavior_notes'), ('preschool_report_cards'),
    ('subjects'), ('assignments'), ('exams')
)
UPDATE tenant_modules AS tm
SET is_active = false,
    enabled = false,
    is_required = false,
    source = 'readiness_gate',
    updated_at = NOW()
FROM blocked
WHERE tm.module_key = blocked.module_key;

UPDATE subscription_plans AS sp
SET modules = COALESCE((
      SELECT jsonb_agg(module_key ORDER BY ordinal)
      FROM jsonb_array_elements_text(COALESCE(sp.modules, '[]'::jsonb))
           WITH ORDINALITY AS plan_module(module_key, ordinal)
      WHERE module_key IN (
        'auth', 'users', 'academic_core', 'grading', 'students', 'groups',
        'grades', 'schedules', 'attendance'
      )
    ), '[]'::jsonb),
    updated_at = NOW();

DELETE FROM module_package_items
WHERE module_key NOT IN (
  'auth', 'users', 'academic_core', 'grading', 'students', 'groups',
  'grades', 'schedules', 'attendance'
);

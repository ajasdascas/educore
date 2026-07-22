-- MySQL parity for the production readiness gate in PostgreSQL migration 020.

UPDATE modules_catalog
SET status = 'active',
    global_enabled = TRUE,
    supported_now = TRUE,
    metadata = JSON_SET(COALESCE(metadata, JSON_OBJECT()),
      '$.production_ready', TRUE,
      '$.readiness_gate', '2026-07-21'),
    updated_at = CURRENT_TIMESTAMP
WHERE `key` IN (
  'auth', 'users', 'academic_core', 'grading', 'students', 'groups',
  'grades', 'schedules', 'attendance'
);

UPDATE modules_catalog
SET status = IF(status = 'planned', 'planned', 'readiness_blocked'),
    global_enabled = FALSE,
    supported_now = FALSE,
    metadata = JSON_SET(COALESCE(metadata, JSON_OBJECT()),
      '$.production_ready', FALSE,
      '$.readiness_gate', '2026-07-21',
      '$.readiness_reason', 'Requires a complete production contract and automated tests'),
    updated_at = CURRENT_TIMESTAMP
WHERE `key` IN (
  'documents', 'report_cards', 'reports', 'communications', 'communication',
  'payments', 'payments_basic', 'parent_portal', 'teacher_portal', 'analytics',
  'database_admin', 'qr_access', 'credentials', 'workshops',
  'portal_school_admin', 'portal_parents', 'portal_teachers', 'portal_students',
  'daily_logs', 'meals', 'naps', 'diapers', 'mood', 'health_checks',
  'incidents', 'pickup_authorizations', 'milestones', 'photos_evidence',
  'qualitative_assessments', 'development_areas', 'observations', 'activities',
  'behavior_notes', 'preschool_report_cards', 'subjects', 'assignments', 'exams'
);

UPDATE modules_catalog
SET is_core = FALSE, updated_at = CURRENT_TIMESTAMP
WHERE `key` IN ('reports', 'communications');

UPDATE tenant_modules
SET is_required = FALSE,
    source = IF(source = 'level', 'readiness_migration', source),
    updated_at = CURRENT_TIMESTAMP
WHERE module_key IN ('schedules', 'attendance');

UPDATE tenant_modules
SET is_active = FALSE,
    enabled = FALSE,
    is_required = FALSE,
    source = 'readiness_gate',
    updated_at = CURRENT_TIMESTAMP
WHERE module_key IN (
  'documents', 'report_cards', 'reports', 'communications', 'communication',
  'payments', 'payments_basic', 'parent_portal', 'teacher_portal', 'analytics',
  'database_admin', 'qr_access', 'credentials', 'workshops',
  'portal_school_admin', 'portal_parents', 'portal_teachers', 'portal_students',
  'daily_logs', 'meals', 'naps', 'diapers', 'mood', 'health_checks',
  'incidents', 'pickup_authorizations', 'milestones', 'photos_evidence',
  'qualitative_assessments', 'development_areas', 'observations', 'activities',
  'behavior_notes', 'preschool_report_cards', 'subjects', 'assignments', 'exams'
);

UPDATE subscription_plans AS sp
SET sp.modules = COALESCE((
  SELECT JSON_ARRAYAGG(plan_module.module_key)
  FROM JSON_TABLE(
    COALESCE(sp.modules, JSON_ARRAY()),
    '$[*]' COLUMNS(module_key VARCHAR(80) PATH '$')
  ) AS plan_module
  WHERE plan_module.module_key IN (
    'auth', 'users', 'academic_core', 'grading', 'students', 'groups',
    'grades', 'schedules', 'attendance'
  )
), JSON_ARRAY()),
sp.updated_at = CURRENT_TIMESTAMP;

DELETE FROM module_package_items
WHERE module_key NOT IN (
  'auth', 'users', 'academic_core', 'grading', 'students', 'groups',
  'grades', 'schedules', 'attendance'
);

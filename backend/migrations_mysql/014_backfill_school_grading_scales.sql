-- Migration 014: repair the default grading scale for previously provisioned schools.
-- Idempotent and additive: existing scales are never overwritten.

INSERT IGNORE INTO school_grading_scales (
  id,
  tenant_id,
  name,
  min_score,
  max_score,
  passing,
  scale_json,
  is_default,
  created_at
)
SELECT
  UUID(),
  t.id,
  'Escala default',
  0,
  100,
  60,
  JSON_OBJECT('min', 0, 'max', 100, 'passing', 60),
  1,
  CURRENT_TIMESTAMP
FROM tenants t
WHERE t.status = 'active'
  AND t.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM school_grading_scales sg
    WHERE sg.tenant_id = t.id
  );

INSERT IGNORE INTO school_provisioning_events (
  id,
  tenant_id,
  event_type,
  payload_json,
  created_at
)
SELECT
  UUID(),
  t.id,
  'backfill_grading_scales_014',
  JSON_OBJECT(
    'migration', '014_backfill_school_grading_scales',
    'result', 'default_scale_present',
    'applied_at', CURRENT_TIMESTAMP
  ),
  CURRENT_TIMESTAMP
FROM tenants t
WHERE t.status = 'active'
  AND t.deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM school_grading_scales sg
    WHERE sg.tenant_id = t.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM school_provisioning_events spe
    WHERE spe.tenant_id = t.id
      AND spe.event_type = 'backfill_grading_scales_014'
  );

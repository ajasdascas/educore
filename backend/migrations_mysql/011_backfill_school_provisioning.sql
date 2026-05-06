-- 011_backfill_school_provisioning.sql
-- Backfill provisioning data for existing schools.
-- Compatible with production Hostinger schema: school_settings does NOT have
-- settings_json. Detected columns: tenant_id, school_year, periods,
-- grading_scale, primary_color, notification_settings, security_settings,
-- created_at, updated_at.
-- Idempotent: all statements use INSERT IGNORE or NOT EXISTS guards.
-- Apply manually in Hostinger: paste into MySQL console or phpMyAdmin.

-- ─── Backfill school_levels for existing tenants ────────────────────────────
-- Cannot read education_level from school_settings (no settings_json column).
-- Default to 'kinder' / 'Kinder' for all existing active tenants.
INSERT IGNORE INTO school_levels (id, tenant_id, level_code, level_name, is_active, created_at)
SELECT
    UUID(),
    t.id,
    'kinder',
    'Kinder',
    1,
    NOW()
FROM tenants t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM school_levels sl WHERE sl.tenant_id = t.id
  );

-- ─── Backfill school_portals for existing tenants ───────────────────────────
INSERT IGNORE INTO school_portals (id, tenant_id, portal_type, internal_url, subdomain_url, is_active, created_at)
SELECT
    UUID(),
    t.id,
    'school_admin',
    CONCAT('/escuela/?slug=', t.slug, '&role=school_admin'),
    CONCAT('https://', t.slug, '.onlineu.mx/login?role=school_admin'),
    1,
    NOW()
FROM tenants t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM school_portals sp
    WHERE sp.tenant_id = t.id AND sp.portal_type = 'school_admin'
  );

INSERT IGNORE INTO school_portals (id, tenant_id, portal_type, internal_url, subdomain_url, is_active, created_at)
SELECT
    UUID(),
    t.id,
    'teacher',
    CONCAT('/escuela/?slug=', t.slug, '&role=teacher'),
    CONCAT('https://', t.slug, '.onlineu.mx/login?role=teacher'),
    1,
    NOW()
FROM tenants t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM school_portals sp
    WHERE sp.tenant_id = t.id AND sp.portal_type = 'teacher'
  );

INSERT IGNORE INTO school_portals (id, tenant_id, portal_type, internal_url, subdomain_url, is_active, created_at)
SELECT
    UUID(),
    t.id,
    'parent',
    CONCAT('/escuela/?slug=', t.slug, '&role=parent'),
    CONCAT('https://', t.slug, '.onlineu.mx/login?role=parent'),
    1,
    NOW()
FROM tenants t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM school_portals sp
    WHERE sp.tenant_id = t.id AND sp.portal_type = 'parent'
  );

INSERT IGNORE INTO school_portals (id, tenant_id, portal_type, internal_url, subdomain_url, is_active, created_at)
SELECT
    UUID(),
    t.id,
    'student',
    CONCAT('/escuela/?slug=', t.slug, '&role=student'),
    CONCAT('https://', t.slug, '.onlineu.mx/login?role=student'),
    1,
    NOW()
FROM tenants t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM school_portals sp
    WHERE sp.tenant_id = t.id AND sp.portal_type = 'student'
  );

-- ─── Backfill school_grading_scales for existing tenants ────────────────────
-- No settings_json to detect level; default qualitative scale for all
-- active tenants that have no grading scale yet.
INSERT IGNORE INTO school_grading_scales (id, tenant_id, scale_name, min_value, max_value, passing_value, scale_type, created_at)
SELECT
    UUID(),
    t.id,
    'Escala cualitativa preescolar',
    NULL,
    NULL,
    NULL,
    'qualitative',
    NOW()
FROM tenants t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM school_grading_scales sgs WHERE sgs.tenant_id = t.id
  );

-- ─── Register provisioning backfill event ───────────────────────────────────
INSERT IGNORE INTO school_provisioning_events (id, tenant_id, event_type, payload, created_at)
SELECT
    UUID(),
    t.id,
    'backfill_011',
    JSON_OBJECT(
        'migration', '011_backfill_school_provisioning',
        'applied_at', NOW()
    ),
    NOW()
FROM tenants t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM school_provisioning_events spe
    WHERE spe.tenant_id = t.id AND spe.event_type = 'backfill_011'
  );

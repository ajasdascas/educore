-- 011_backfill_school_provisioning.sql
-- Backfill provisioning data for existing schools.
-- Idempotent: all statements use INSERT IGNORE or IF NOT EXISTS.
-- Apply manually in Hostinger: paste into MySQL console or phpMyAdmin.

-- ─── Backfill school_levels for existing tenants ────────────────────────────
-- Assumes kinder/preescolar unless school_settings already has education_level.
INSERT IGNORE INTO school_levels (id, tenant_id, level_code, level_name, is_active, created_at)
SELECT
    UUID(),
    t.id,
    COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(ss.settings_json, '$.education_level')),
        'kinder'
    ),
    CASE
        WHEN JSON_UNQUOTE(JSON_EXTRACT(ss.settings_json, '$.education_level')) = 'babies'    THEN 'Bebés / Guardería'
        WHEN JSON_UNQUOTE(JSON_EXTRACT(ss.settings_json, '$.education_level')) = 'preescolar' THEN 'Preescolar'
        WHEN JSON_UNQUOTE(JSON_EXTRACT(ss.settings_json, '$.education_level')) = 'kinder'    THEN 'Kinder'
        WHEN JSON_UNQUOTE(JSON_EXTRACT(ss.settings_json, '$.education_level')) = 'primaria'  THEN 'Primaria'
        ELSE 'Kinder'
    END,
    1,
    NOW()
FROM tenants t
LEFT JOIN school_settings ss ON ss.tenant_id = t.id
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

-- ─── Backfill school_grading_scales for kinder/preescolar ──────────────────
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
LEFT JOIN school_settings ss ON ss.tenant_id = t.id
WHERE t.status = 'active'
  AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ss.settings_json, '$.education_level')), 'kinder')
      IN ('kinder', 'preescolar', 'babies')
  AND NOT EXISTS (
    SELECT 1 FROM school_grading_scales sgs WHERE sgs.tenant_id = t.id
  );

INSERT IGNORE INTO school_grading_scales (id, tenant_id, scale_name, min_value, max_value, passing_value, scale_type, created_at)
SELECT
    UUID(),
    t.id,
    'Escala numérica 0-10',
    0,
    10,
    6,
    'numeric',
    NOW()
FROM tenants t
LEFT JOIN school_settings ss ON ss.tenant_id = t.id
WHERE t.status = 'active'
  AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ss.settings_json, '$.education_level')), 'kinder')
      = 'primaria'
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

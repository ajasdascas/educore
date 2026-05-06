-- 011_backfill_school_provisioning.sql
-- Backfill provisioning data for existing active schools.
-- Schema verified against Hostinger production (2026-05-05).
--
-- school_levels  : id, tenant_id, level_key, name, enabled, sort_order, created_at, updated_at
-- school_portals : id, tenant_id, slug, internal_url, subdomain_url,
--                  dns_status, hosting_status, ssl_status, is_primary, created_at, updated_at
-- school_modules : id, tenant_id, module_key, module_name, category,
--                  enabled, required, level_scope, sort_order, config_json, created_at, updated_at
--
-- Idempotent: INSERT IGNORE + NOT EXISTS guards on every block.
-- Apply manually: paste into MySQL console or phpMyAdmin on Hostinger.

-- ─── school_levels ────────────────────────────────────────────────────────────
INSERT IGNORE INTO school_levels (id, tenant_id, level_key, name, enabled, sort_order, created_at)
SELECT
    UUID(),
    t.id,
    'kindergarten',
    'Kínder',
    1,
    10,
    NOW()
FROM tenants t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM school_levels sl WHERE sl.tenant_id = t.id
  );

-- ─── school_portals ───────────────────────────────────────────────────────────
-- One primary portal per tenant. Use school slug as portal slug.
INSERT IGNORE INTO school_portals (
    id, tenant_id, slug,
    internal_url, subdomain_url,
    dns_status, hosting_status, ssl_status,
    is_primary, created_at
)
SELECT
    UUID(),
    t.id,
    t.slug,
    CONCAT('https://onlineu.mx/educore/escuela/?slug=', t.slug),
    CONCAT('https://', t.slug, '.onlineu.mx'),
    'wildcard',
    'basepath_conflict',
    'unknown',
    1,
    NOW()
FROM tenants t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM school_portals sp WHERE sp.tenant_id = t.id AND sp.slug = t.slug
  );

-- ─── school_modules — core (all levels) ──────────────────────────────────────
INSERT IGNORE INTO school_modules (
    id, tenant_id, module_key, module_name,
    category, enabled, required, level_scope,
    sort_order, config_json, created_at
)
SELECT UUID(), t.id, 'attendance',     'Asistencia',     'core', 1, 1, NULL, 10, '{}', NOW() FROM tenants t WHERE t.status = 'active' AND NOT EXISTS (SELECT 1 FROM school_modules sm WHERE sm.tenant_id = t.id AND sm.module_key = 'attendance');

INSERT IGNORE INTO school_modules (
    id, tenant_id, module_key, module_name,
    category, enabled, required, level_scope,
    sort_order, config_json, created_at
)
SELECT UUID(), t.id, 'grades',         'Calificaciones', 'core', 1, 1, NULL, 20, '{}', NOW() FROM tenants t WHERE t.status = 'active' AND NOT EXISTS (SELECT 1 FROM school_modules sm WHERE sm.tenant_id = t.id AND sm.module_key = 'grades');

INSERT IGNORE INTO school_modules (
    id, tenant_id, module_key, module_name,
    category, enabled, required, level_scope,
    sort_order, config_json, created_at
)
SELECT UUID(), t.id, 'reports',        'Reportes',       'core', 1, 0, NULL, 30, '{}', NOW() FROM tenants t WHERE t.status = 'active' AND NOT EXISTS (SELECT 1 FROM school_modules sm WHERE sm.tenant_id = t.id AND sm.module_key = 'reports');

INSERT IGNORE INTO school_modules (
    id, tenant_id, module_key, module_name,
    category, enabled, required, level_scope,
    sort_order, config_json, created_at
)
SELECT UUID(), t.id, 'communications', 'Comunicaciones', 'core', 1, 0, NULL, 40, '{}', NOW() FROM tenants t WHERE t.status = 'active' AND NOT EXISTS (SELECT 1 FROM school_modules sm WHERE sm.tenant_id = t.id AND sm.module_key = 'communications');

-- ─── school_modules — kindergarten-specific ──────────────────────────────────
INSERT IGNORE INTO school_modules (
    id, tenant_id, module_key, module_name,
    category, enabled, required, level_scope,
    sort_order, config_json, created_at
)
SELECT UUID(), t.id, 'activities',  'Actividades',         'academic', 1, 0, 'kindergarten', 50, '{}', NOW() FROM tenants t WHERE t.status = 'active' AND NOT EXISTS (SELECT 1 FROM school_modules sm WHERE sm.tenant_id = t.id AND sm.module_key = 'activities');

INSERT IGNORE INTO school_modules (
    id, tenant_id, module_key, module_name,
    category, enabled, required, level_scope,
    sort_order, config_json, created_at
)
SELECT UUID(), t.id, 'development', 'Desarrollo Infantil', 'academic', 1, 0, 'kindergarten', 60, '{}', NOW() FROM tenants t WHERE t.status = 'active' AND NOT EXISTS (SELECT 1 FROM school_modules sm WHERE sm.tenant_id = t.id AND sm.module_key = 'development');

-- ─── Register provisioning backfill event (idempotency marker) ───────────────
INSERT IGNORE INTO school_provisioning_events (id, tenant_id, event_type, payload_json, created_at)
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

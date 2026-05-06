-- Migration 009: School Levels, Modules, Portals, Feature Flags, Periods, Grading Scales, Provisioning Events
-- Run manually on Hostinger production MySQL:
--   mysql -h HOST -u USER -p DATABASE < backend/migrations_mysql/009_school_levels_modules_portals.sql
-- Safe to run multiple times (IF NOT EXISTS guards throughout).

-- ─── school_levels ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_levels (
  id          CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id   CHAR(36)     NOT NULL,
  level_key   VARCHAR(50)  NOT NULL,
  name        VARCHAR(100) NOT NULL,
  enabled     TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY  uq_school_level (tenant_id, level_key),
  KEY         idx_school_levels_tenant (tenant_id),
  CONSTRAINT  fk_school_levels_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── school_modules ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_modules (
  id           CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id    CHAR(36)     NOT NULL,
  module_key   VARCHAR(100) NOT NULL,
  module_name  VARCHAR(150) NOT NULL DEFAULT '',
  category     VARCHAR(50)  NOT NULL DEFAULT 'general',
  enabled      TINYINT(1)   NOT NULL DEFAULT 1,
  required     TINYINT(1)   NOT NULL DEFAULT 0,
  level_scope  VARCHAR(50)  NULL,
  sort_order   INT          NOT NULL DEFAULT 0,
  config_json  JSON         NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY   uq_school_module (tenant_id, module_key),
  KEY          idx_school_modules_tenant   (tenant_id),
  KEY          idx_school_modules_level    (tenant_id, level_scope),
  KEY          idx_school_modules_enabled  (tenant_id, enabled),
  CONSTRAINT   fk_school_modules_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── school_portals ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_portals (
  id              CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id       CHAR(36)     NOT NULL,
  slug            VARCHAR(100) NOT NULL,
  internal_url    VARCHAR(500) NOT NULL DEFAULT '',
  subdomain_url   VARCHAR(500) NOT NULL DEFAULT '',
  dns_status      VARCHAR(30)  NOT NULL DEFAULT 'unknown',
  hosting_status  VARCHAR(30)  NOT NULL DEFAULT 'basepath_conflict',
  ssl_status      VARCHAR(30)  NOT NULL DEFAULT 'unknown',
  is_primary      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY      uq_school_portal_slug (tenant_id, slug),
  KEY             idx_school_portals_tenant (tenant_id),
  CONSTRAINT      fk_school_portals_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── school_feature_flags ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_feature_flags (
  id          CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id   CHAR(36)     NOT NULL,
  flag_key    VARCHAR(100) NOT NULL,
  enabled     TINYINT(1)   NOT NULL DEFAULT 0,
  value_json  JSON         NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY  uq_school_flag (tenant_id, flag_key),
  KEY         idx_school_flags_tenant (tenant_id),
  CONSTRAINT  fk_school_flags_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── school_periods ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_periods (
  id             CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id      CHAR(36)     NOT NULL,
  school_year_id CHAR(36)     NULL,
  name           VARCHAR(100) NOT NULL,
  start_date     DATE         NULL,
  end_date       DATE         NULL,
  sort_order     INT          NOT NULL DEFAULT 0,
  is_current     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY            idx_school_periods_tenant (tenant_id),
  KEY            idx_school_periods_year   (tenant_id, school_year_id),
  CONSTRAINT     fk_school_periods_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── school_grading_scales ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_grading_scales (
  id          CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id   CHAR(36)     NOT NULL,
  name        VARCHAR(100) NOT NULL DEFAULT 'Escala default',
  min_score   DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_score   DECIMAL(5,2) NOT NULL DEFAULT 100,
  passing     DECIMAL(5,2) NOT NULL DEFAULT 60,
  scale_json  JSON         NULL,
  is_default  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY         idx_grading_scales_tenant (tenant_id),
  CONSTRAINT  fk_grading_scales_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── school_provisioning_events ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_provisioning_events (
  id          CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id   CHAR(36)     NOT NULL,
  event_type  VARCHAR(100) NOT NULL DEFAULT 'provision_school',
  status      VARCHAR(30)  NOT NULL DEFAULT 'completed',
  triggered_by CHAR(36)    NULL,
  payload_json JSON        NULL,
  error_msg   TEXT         NULL,
  duration_ms INT          NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY         idx_prov_events_tenant (tenant_id),
  KEY         idx_prov_events_type   (tenant_id, event_type),
  CONSTRAINT  fk_prov_events_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Backfill: registrar escuelas existentes en school_portals ─────────────────
-- Inserta un portal interno para cada tenant activo que aún no tenga registro.
INSERT IGNORE INTO school_portals (id, tenant_id, slug, internal_url, subdomain_url, dns_status, hosting_status, ssl_status, is_primary)
SELECT
  UUID(),
  t.id,
  t.slug,
  CONCAT('https://onlineu.mx/educore/escuela/?slug=', t.slug),
  CONCAT('https://', t.slug, '.onlineu.mx'),
  'unknown',
  'basepath_conflict',
  'unknown',
  1
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM school_portals sp WHERE sp.tenant_id = t.id
);

-- ─── Backfill: registrar escala de calificación default para tenants existentes ─
INSERT IGNORE INTO school_grading_scales (id, tenant_id, name, min_score, max_score, passing, is_default)
SELECT UUID(), t.id, 'Escala default', 0, 100, 60, 1
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM school_grading_scales sg WHERE sg.tenant_id = t.id
);

-- ============================================================
-- Migration 018 v2: Kinder & Preschool Data Tables
-- HOSTINGER/MARIADB ULTRA-COMPATIBLE VERSION
-- No ENUM, no JSON, no CHECK, no DEFAULT (UUID()),
-- no reserved-word column names
-- Idempotent: all CREATE TABLE IF NOT EXISTS
-- No foreign keys (added in separate migration after all tables exist)
-- ============================================================

-- ── 01. kinder_daily_logs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kinder_daily_logs (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id     CHAR(36)     NOT NULL,
  student_id    CHAR(36)     NOT NULL,
  teacher_id    CHAR(36)     NOT NULL,
  log_date      DATE         NOT NULL,
  general_mood  VARCHAR(40)  NULL,
  notes         TEXT         NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_kinder_daily_log (tenant_id, student_id, log_date),
  INDEX idx_kdl_tenant_student (tenant_id, student_id),
  INDEX idx_kdl_date (tenant_id, log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 02. kinder_meals ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kinder_meals (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id     CHAR(36)     NOT NULL,
  student_id    CHAR(36)     NOT NULL,
  teacher_id    CHAR(36)     NOT NULL,
  meal_date     DATE         NOT NULL,
  meal_time     VARCHAR(40)  NOT NULL DEFAULT 'lunch',
  meal_portion  VARCHAR(40)  NOT NULL DEFAULT 'full',
  meal_note     VARCHAR(300) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_kinder_meals_tenant_date (tenant_id, meal_date),
  INDEX idx_kinder_meals_student_date (student_id, meal_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 03. kinder_naps ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kinder_naps (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id        CHAR(36)     NOT NULL,
  student_id       CHAR(36)     NOT NULL,
  teacher_id       CHAR(36)     NOT NULL,
  nap_date         DATE         NOT NULL,
  start_time       TIME         NULL,
  end_time         TIME         NULL,
  duration_minutes INT          NULL,
  quality          VARCHAR(40)  NOT NULL DEFAULT 'good',
  notes            VARCHAR(300) NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_kn_tenant_student_date (tenant_id, student_id, nap_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 04. kinder_diapers ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kinder_diapers (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id     CHAR(36)     NOT NULL,
  student_id    CHAR(36)     NOT NULL,
  teacher_id    CHAR(36)     NOT NULL,
  changed_at    DATETIME     NOT NULL,
  diaper_type   VARCHAR(40)  NOT NULL DEFAULT 'wet',
  notes         VARCHAR(300) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_kd_tenant_student (tenant_id, student_id),
  INDEX idx_kd_date (tenant_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 05. kinder_mood ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kinder_mood (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id     CHAR(36)     NOT NULL,
  student_id    CHAR(36)     NOT NULL,
  teacher_id    CHAR(36)     NOT NULL,
  recorded_at   DATETIME     NOT NULL,
  mood_code     VARCHAR(40)  NOT NULL DEFAULT 'calm',
  notes         VARCHAR(300) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_kmood_tenant_student (tenant_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 06. kinder_incidents ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kinder_incidents (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id        CHAR(36)     NOT NULL,
  student_id       CHAR(36)     NOT NULL,
  teacher_id       CHAR(36)     NOT NULL,
  occurred_at      DATETIME     NOT NULL,
  incident_type    VARCHAR(40)  NOT NULL DEFAULT 'other',
  description      TEXT         NOT NULL,
  action_taken     TEXT         NULL,
  notified_parent  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ki_tenant_student (tenant_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 07. pickup_authorizations ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pickup_authorizations (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id        CHAR(36)     NOT NULL,
  student_id       CHAR(36)     NOT NULL,
  authorized_name  VARCHAR(200) NOT NULL,
  relationship     VARCHAR(80)  NOT NULL DEFAULT 'family',
  phone            VARCHAR(30)  NULL,
  notes            TEXT         NULL,
  is_active        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pa_tenant_student (tenant_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 08. preschool_qualitative_assessments ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS preschool_qualitative_assessments (
  id                   CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id            CHAR(36)     NOT NULL,
  student_id           CHAR(36)     NOT NULL,
  teacher_id           CHAR(36)     NOT NULL,
  period               VARCHAR(80)  NOT NULL DEFAULT 'current',
  campo_formativo      VARCHAR(120) NOT NULL,
  aprendizaje_esperado VARCHAR(400) NULL,
  nivel                VARCHAR(40)  NOT NULL DEFAULT 'en_proceso',
  notes                TEXT         NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pqa_tenant_student (tenant_id, student_id),
  INDEX idx_pqa_period (tenant_id, period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 09. preschool_development_areas ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS preschool_development_areas (
  id                CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id         CHAR(36)     NOT NULL,
  student_id        CHAR(36)     NOT NULL,
  teacher_id        CHAR(36)     NOT NULL,
  area_name         VARCHAR(120) NOT NULL,
  area_description  TEXT         NULL,
  evaluation_period VARCHAR(80)  NOT NULL DEFAULT 'current',
  achievement_level VARCHAR(40)  NOT NULL DEFAULT 'en_proceso',
  observations      TEXT         NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pda_tenant_student (tenant_id, student_id),
  INDEX idx_pda_area (tenant_id, area_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 10. preschool_observations ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS preschool_observations (
  id                    CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id             CHAR(36)     NOT NULL,
  student_id            CHAR(36)     NOT NULL,
  teacher_id            CHAR(36)     NOT NULL,
  observed_at           DATE         NOT NULL,
  category              VARCHAR(40)  NOT NULL DEFAULT 'general',
  content               TEXT         NOT NULL,
  is_visible_to_parent  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_po_tenant_student (tenant_id, student_id),
  INDEX idx_po_date (tenant_id, observed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 11. preschool_evidence ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS preschool_evidence (
  id                    CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id             CHAR(36)     NOT NULL,
  student_id            CHAR(36)     NOT NULL,
  teacher_id            CHAR(36)     NOT NULL,
  title                 VARCHAR(200) NOT NULL,
  description           TEXT         NULL,
  category              VARCHAR(80)  NULL,
  image_url             VARCHAR(500) NULL,
  file_url              VARCHAR(500) NULL,
  is_visible_to_parent  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pe_tenant_student (tenant_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

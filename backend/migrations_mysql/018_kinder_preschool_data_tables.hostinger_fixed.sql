-- ============================================================
-- Migration 018: Kinder & Preschool Data Tables
-- HOSTINGER/MARIADB FIXED VERSION — all ENUM replaced with VARCHAR(40)
-- Idempotent (IF NOT EXISTS / INSERT IGNORE)
-- ============================================================

-- ── Kinder: daily log (one per student per day) ───────────────────────────────
CREATE TABLE IF NOT EXISTS kinder_daily_logs (
  id          CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id   CHAR(36)     NOT NULL,
  student_id  CHAR(36)     NOT NULL,
  teacher_id  CHAR(36)     NOT NULL,
  log_date    DATE         NOT NULL,
  general_mood VARCHAR(40) NULL,
  notes       TEXT         NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY  uq_kinder_daily_log (tenant_id, student_id, log_date),
  KEY idx_kdl_tenant_student (tenant_id, student_id),
  KEY idx_kdl_date (tenant_id, log_date),
  CONSTRAINT fk_kdl_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)   ON DELETE CASCADE,
  CONSTRAINT fk_kdl_student FOREIGN KEY (student_id) REFERENCES students(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Kinder: meals (multiple per day per student) ─────────────────────────────
CREATE TABLE IF NOT EXISTS kinder_meals (
  id          CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id   CHAR(36)     NOT NULL,
  student_id  CHAR(36)     NOT NULL,
  teacher_id  CHAR(36)     NOT NULL,
  meal_date   DATE         NOT NULL,
  meal_time   VARCHAR(40)  NOT NULL DEFAULT 'lunch',
  portion     VARCHAR(40)  NOT NULL DEFAULT 'full',
  food_note   VARCHAR(300) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_km_tenant_student_date (tenant_id, student_id, meal_date),
  CONSTRAINT fk_km_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)   ON DELETE CASCADE,
  CONSTRAINT fk_km_student FOREIGN KEY (student_id) REFERENCES students(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Kinder: naps ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kinder_naps (
  id               CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id        CHAR(36) NOT NULL,
  student_id       CHAR(36) NOT NULL,
  teacher_id       CHAR(36) NOT NULL,
  nap_date         DATE     NOT NULL,
  start_time       TIME     NULL,
  end_time         TIME     NULL,
  duration_minutes INT      NULL,
  quality          VARCHAR(40) NOT NULL DEFAULT 'good',
  notes            VARCHAR(300) NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_kn_tenant_student_date (tenant_id, student_id, nap_date),
  CONSTRAINT fk_kn_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)   ON DELETE CASCADE,
  CONSTRAINT fk_kn_student FOREIGN KEY (student_id) REFERENCES students(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Kinder: diaper changes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kinder_diapers (
  id           CHAR(36)  NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id    CHAR(36)  NOT NULL,
  student_id   CHAR(36)  NOT NULL,
  teacher_id   CHAR(36)  NOT NULL,
  changed_at   DATETIME  NOT NULL,
  diaper_type  VARCHAR(40) NOT NULL DEFAULT 'wet',
  notes        VARCHAR(300) NULL,
  created_at   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_kd_tenant_student (tenant_id, student_id),
  KEY idx_kd_date (tenant_id, changed_at),
  CONSTRAINT fk_kd_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)   ON DELETE CASCADE,
  CONSTRAINT fk_kd_student FOREIGN KEY (student_id) REFERENCES students(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Kinder: mood entries ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kinder_mood (
  id          CHAR(36)  NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id   CHAR(36)  NOT NULL,
  student_id  CHAR(36)  NOT NULL,
  teacher_id  CHAR(36)  NOT NULL,
  recorded_at DATETIME  NOT NULL,
  mood_code   VARCHAR(40) NOT NULL DEFAULT 'calm',
  notes       VARCHAR(300) NULL,
  created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_kmood_tenant_student (tenant_id, student_id),
  CONSTRAINT fk_kmood_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)   ON DELETE CASCADE,
  CONSTRAINT fk_kmood_student FOREIGN KEY (student_id) REFERENCES students(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Kinder: incidents ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kinder_incidents (
  id               CHAR(36)  NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id        CHAR(36)  NOT NULL,
  student_id       CHAR(36)  NOT NULL,
  teacher_id       CHAR(36)  NOT NULL,
  occurred_at      DATETIME  NOT NULL,
  incident_type    VARCHAR(40) NOT NULL DEFAULT 'other',
  description      TEXT      NOT NULL,
  action_taken     TEXT      NULL,
  notified_parent  TINYINT(1) NOT NULL DEFAULT 0,
  created_at       DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ki_tenant_student (tenant_id, student_id),
  CONSTRAINT fk_ki_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)   ON DELETE CASCADE,
  CONSTRAINT fk_ki_student FOREIGN KEY (student_id) REFERENCES students(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Kinder: pickup authorizations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pickup_authorizations (
  id               CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id        CHAR(36)     NOT NULL,
  student_id       CHAR(36)     NOT NULL,
  authorized_name  VARCHAR(200) NOT NULL,
  relationship     VARCHAR(80)  NOT NULL DEFAULT 'family',
  phone            VARCHAR(30)  NULL,
  notes            TEXT         NULL,
  is_active        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pa_tenant_student (tenant_id, student_id),
  CONSTRAINT fk_pa_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)   ON DELETE CASCADE,
  CONSTRAINT fk_pa_student FOREIGN KEY (student_id) REFERENCES students(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Preschool: qualitative assessments ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS preschool_qualitative_assessments (
  id                  CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id           CHAR(36)     NOT NULL,
  student_id          CHAR(36)     NOT NULL,
  teacher_id          CHAR(36)     NOT NULL,
  period              VARCHAR(80)  NOT NULL DEFAULT 'current',
  campo_formativo     VARCHAR(120) NOT NULL,
  aprendizaje_esperado VARCHAR(400) NULL,
  nivel               VARCHAR(40)  NOT NULL DEFAULT 'en_proceso',
  notes               TEXT         NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pqa_tenant_student (tenant_id, student_id),
  KEY idx_pqa_period (tenant_id, period),
  CONSTRAINT fk_pqa_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)   ON DELETE CASCADE,
  CONSTRAINT fk_pqa_student FOREIGN KEY (student_id) REFERENCES students(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Preschool: teacher observations ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS preschool_observations (
  id                   CHAR(36)    NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id            CHAR(36)    NOT NULL,
  student_id           CHAR(36)    NOT NULL,
  teacher_id           CHAR(36)    NOT NULL,
  observed_at          DATE        NOT NULL,
  category             VARCHAR(40) NOT NULL DEFAULT 'general',
  content              TEXT        NOT NULL,
  is_visible_to_parent TINYINT(1)  NOT NULL DEFAULT 1,
  created_at           DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_po_tenant_student (tenant_id, student_id),
  KEY idx_po_date (tenant_id, observed_at),
  CONSTRAINT fk_po_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)   ON DELETE CASCADE,
  CONSTRAINT fk_po_student FOREIGN KEY (student_id) REFERENCES students(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Preschool: learning evidence ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS preschool_evidence (
  id                   CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id            CHAR(36)     NOT NULL,
  student_id           CHAR(36)     NOT NULL,
  teacher_id           CHAR(36)     NOT NULL,
  title                VARCHAR(200) NOT NULL,
  description          TEXT         NULL,
  category             VARCHAR(80)  NULL,
  image_url            VARCHAR(500) NULL,
  file_url             VARCHAR(500) NULL,
  is_visible_to_parent TINYINT(1)   NOT NULL DEFAULT 1,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pe_tenant_student (tenant_id, student_id),
  CONSTRAINT fk_pe_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)   ON DELETE CASCADE,
  CONSTRAINT fk_pe_student FOREIGN KEY (student_id) REFERENCES students(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

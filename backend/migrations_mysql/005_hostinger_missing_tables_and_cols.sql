-- Migration 005: Add ALL remaining missing columns and tables
-- Safe to run multiple times (IF NOT EXISTS guards).

-- 1. parent_student — add columns that may be missing from old import
ALTER TABLE parent_student
  ADD COLUMN IF NOT EXISTS phone               VARCHAR(40)  NULL,
  ADD COLUMN IF NOT EXISTS notes               TEXT         NULL,
  ADD COLUMN IF NOT EXISTS pickup_authorized   BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payment_responsible BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tenant_id           CHAR(36)     NULL;

-- 2. Tables that may be missing entirely
CREATE TABLE IF NOT EXISTS student_academic_history (
  id             CHAR(36)    NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id      CHAR(36)    NOT NULL,
  student_id     CHAR(36)    NOT NULL,
  school_year_id CHAR(36)    NULL,
  grade_id       CHAR(36)    NULL,
  group_id       CHAR(36)    NULL,
  status         VARCHAR(40) NOT NULL DEFAULT 'active',
  notes          TEXT        NULL,
  created_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at     DATETIME    NULL,
  KEY idx_student_history_tenant (tenant_id, student_id),
  CONSTRAINT fk_sah_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)  ON DELETE CASCADE,
  CONSTRAINT fk_sah_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS import_batches (
  id            CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id     CHAR(36)     NOT NULL,
  type          VARCHAR(80)  NULL,
  source_sheet  VARCHAR(255) NULL,
  mapping       JSON         NULL,
  status        VARCHAR(40)  NOT NULL DEFAULT 'completed',
  total_rows    INT          NOT NULL DEFAULT 0,
  imported_rows INT          NOT NULL DEFAULT 0,
  error_rows    INT          NOT NULL DEFAULT 0,
  errors        JSON         NULL,
  created_by    CHAR(36)     NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME     NULL,
  KEY idx_import_batches_tenant (tenant_id, created_at),
  CONSTRAINT fk_import_batches_tenant FOREIGN KEY (tenant_id)  REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_import_batches_user  FOREIGN KEY (created_by) REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parent_conversations (
  id              CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id       CHAR(36)     NOT NULL,
  parent_id       CHAR(36)     NOT NULL,
  recipient_id    CHAR(36)     NOT NULL,
  subject         VARCHAR(200) NOT NULL,
  status          ENUM('open','closed','archived') NOT NULL DEFAULT 'open',
  last_message_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_parent_conv_parent    (parent_id, last_message_at),
  KEY idx_parent_conv_recipient (recipient_id, last_message_at),
  KEY idx_parent_conv_tenant    (tenant_id),
  CONSTRAINT fk_pconv_tenant    FOREIGN KEY (tenant_id)    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_pconv_parent    FOREIGN KEY (parent_id)    REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_pconv_recipient FOREIGN KEY (recipient_id) REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parent_messages (
  id               CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id        CHAR(36)     NOT NULL,
  conversation_id  CHAR(36)     NOT NULL,
  sender_id        CHAR(36)     NOT NULL,
  recipient_id     CHAR(36)     NOT NULL,
  subject          VARCHAR(200) NOT NULL,
  content          TEXT         NOT NULL,
  priority         ENUM('low','normal','medium','high','urgent') NOT NULL DEFAULT 'normal',
  parent_message_id CHAR(36)    NULL,
  has_attachments  BOOLEAN      NOT NULL DEFAULT FALSE,
  read_at          DATETIME     NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pmsg_conversation (conversation_id, created_at),
  KEY idx_pmsg_user         (recipient_id, read_at, created_at),
  KEY idx_pmsg_tenant       (tenant_id),
  CONSTRAINT fk_pmsg_tenant    FOREIGN KEY (tenant_id)       REFERENCES tenants(id)             ON DELETE CASCADE,
  CONSTRAINT fk_pmsg_conv      FOREIGN KEY (conversation_id) REFERENCES parent_conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_pmsg_sender    FOREIGN KEY (sender_id)       REFERENCES users(id)               ON DELETE CASCADE,
  CONSTRAINT fk_pmsg_recipient FOREIGN KEY (recipient_id)    REFERENCES users(id)               ON DELETE CASCADE,
  CONSTRAINT fk_pmsg_parent    FOREIGN KEY (parent_message_id) REFERENCES parent_messages(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parent_teacher_audit_logs (
  id          CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id   CHAR(36)     NOT NULL,
  actor_id    CHAR(36)     NULL,
  actor_role  VARCHAR(40)  NOT NULL,
  action      VARCHAR(120) NOT NULL,
  resource    VARCHAR(120) NOT NULL,
  resource_id CHAR(36)     NULL,
  metadata    JSON         NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pt_audit_tenant (tenant_id),
  CONSTRAINT fk_pt_audit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

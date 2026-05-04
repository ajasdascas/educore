-- Migration 003: Add missing columns and tables to Hostinger MySQL
-- Run this in phpMyAdmin if columns/tables are missing from the initial import.
-- Safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS guards).

-- 1. Add enrollment columns to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS enrollment_number VARCHAR(80) NULL AFTER unique_student_code,
  ADD COLUMN IF NOT EXISTS enrollment_id     VARCHAR(80) NULL AFTER enrollment_number;

-- 2. Create class_schedule_blocks if missing
CREATE TABLE IF NOT EXISTS class_schedule_blocks (
  id           CHAR(36)    NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id    CHAR(36)    NOT NULL,
  group_id     CHAR(36)    NULL,
  subject_id   CHAR(36)    NULL,
  teacher_id   CHAR(36)    NULL,
  room         VARCHAR(120) NULL,
  day          VARCHAR(20)  NULL,
  day_of_week  INT          NOT NULL DEFAULT 1,
  start_time   TIME         NOT NULL,
  end_time     TIME         NOT NULL,
  notes        TEXT         NULL,
  status       ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at   DATETIME    NULL,
  KEY idx_schedule_tenant (tenant_id),
  CONSTRAINT fk_schedule_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)   ON DELETE CASCADE,
  CONSTRAINT fk_schedule_group   FOREIGN KEY (group_id)   REFERENCES groups(id)    ON DELETE SET NULL,
  CONSTRAINT fk_schedule_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)  ON DELETE SET NULL,
  CONSTRAINT fk_schedule_teacher FOREIGN KEY (teacher_id) REFERENCES users(id)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration 004: Add remaining missing columns to students table
-- These columns exist in 001_hostinger_core.sql but were not present
-- in the initial Hostinger import. Safe to run multiple times.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS notes             TEXT         NULL,
  ADD COLUMN IF NOT EXISTS special_notes     TEXT         NULL,
  ADD COLUMN IF NOT EXISTS allergies         TEXT         NULL,
  ADD COLUMN IF NOT EXISTS medical_conditions TEXT        NULL,
  ADD COLUMN IF NOT EXISTS birth_day         INT          NULL,
  ADD COLUMN IF NOT EXISTS birth_month       INT          NULL,
  ADD COLUMN IF NOT EXISTS birth_year        INT          NULL,
  ADD COLUMN IF NOT EXISTS curp              VARCHAR(30)  NULL,
  ADD COLUMN IF NOT EXISTS photo_url         TEXT         NULL,
  ADD COLUMN IF NOT EXISTS source_sheet      VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS import_source     VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS unique_student_code VARCHAR(60) NULL DEFAULT (UUID());

-- 018 Part 05: kinder_mood
-- Mood/emotional state entries
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

-- 018 Part 02: kinder_meals
-- Multiple meals per student per day
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

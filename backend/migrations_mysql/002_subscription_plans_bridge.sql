-- EduCore Hostinger MySQL bridge incremental migration.
-- Safe to import after 001_hostinger_core.sql when an older/partial import
-- created `plans` but missed `subscription_plans`.

CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  price_monthly DECIMAL(12,2) NOT NULL DEFAULT 0,
  price_annual DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'MXN',
  max_students INT NOT NULL DEFAULT 0,
  max_teachers INT NOT NULL DEFAULT 0,
  modules JSON NULL,
  features JSON NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uq_subscription_plans_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO subscription_plans (
  id, name, description, price_monthly, price_annual, currency,
  max_students, max_teachers, modules, features, is_active, is_featured
)
SELECT
  id, name, description, price_monthly, price_annual, currency,
  max_students, max_teachers, modules, features, is_active, is_featured
FROM plans
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  price_monthly = VALUES(price_monthly),
  price_annual = VALUES(price_annual),
  currency = VALUES(currency),
  max_students = VALUES(max_students),
  max_teachers = VALUES(max_teachers),
  modules = VALUES(modules),
  features = VALUES(features),
  is_active = VALUES(is_active),
  is_featured = VALUES(is_featured),
  updated_at = CURRENT_TIMESTAMP;


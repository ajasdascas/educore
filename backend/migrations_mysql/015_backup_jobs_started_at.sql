-- 015_backup_jobs_started_at.sql
-- Adds started_at column to backup_jobs so the backup runner can record
-- when execution actually began (separate from queued created_at).
-- Idempotent: uses ADD COLUMN IF NOT EXISTS which MariaDB 10.3+ supports.
-- For MySQL 5.7 the IF NOT EXISTS is ignored on older versions — the migration
-- is wrapped in a stored procedure to be safe on both engines.

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'backup_jobs'
    AND COLUMN_NAME  = 'started_at'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE backup_jobs ADD COLUMN started_at DATETIME NULL AFTER completed_at',
  'SELECT 1 -- started_at already exists, nothing to do'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

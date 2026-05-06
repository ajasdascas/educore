-- 016_backup_jobs_metadata_and_storage.sql
-- Adds title, description, storage metadata, soft-delete and size_bytes to backup_jobs.
-- Idempotent: each ALTER is guarded by an information_schema check.

-- title
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'backup_jobs' AND COLUMN_NAME = 'title');
SET @sql = IF(@col = 0, 'ALTER TABLE backup_jobs ADD COLUMN title VARCHAR(255) NULL AFTER status', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- description
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'backup_jobs' AND COLUMN_NAME = 'description');
SET @sql = IF(@col = 0, 'ALTER TABLE backup_jobs ADD COLUMN description TEXT NULL AFTER title', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- storage_provider
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'backup_jobs' AND COLUMN_NAME = 'storage_provider');
SET @sql = IF(@col = 0, 'ALTER TABLE backup_jobs ADD COLUMN storage_provider VARCHAR(50) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- storage_key
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'backup_jobs' AND COLUMN_NAME = 'storage_key');
SET @sql = IF(@col = 0, 'ALTER TABLE backup_jobs ADD COLUMN storage_key VARCHAR(500) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- file_name
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'backup_jobs' AND COLUMN_NAME = 'file_name');
SET @sql = IF(@col = 0, 'ALTER TABLE backup_jobs ADD COLUMN file_name VARCHAR(255) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- checksum_sha256
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'backup_jobs' AND COLUMN_NAME = 'checksum_sha256');
SET @sql = IF(@col = 0, 'ALTER TABLE backup_jobs ADD COLUMN checksum_sha256 VARCHAR(128) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- size_bytes
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'backup_jobs' AND COLUMN_NAME = 'size_bytes');
SET @sql = IF(@col = 0, 'ALTER TABLE backup_jobs ADD COLUMN size_bytes BIGINT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- deleted_at (soft delete)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'backup_jobs' AND COLUMN_NAME = 'deleted_at');
SET @sql = IF(@col = 0, 'ALTER TABLE backup_jobs ADD COLUMN deleted_at DATETIME NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- deleted_by
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'backup_jobs' AND COLUMN_NAME = 'deleted_by');
SET @sql = IF(@col = 0, 'ALTER TABLE backup_jobs ADD COLUMN deleted_by CHAR(36) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- updated_at
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'backup_jobs' AND COLUMN_NAME = 'updated_at');
SET @sql = IF(@col = 0, 'ALTER TABLE backup_jobs ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

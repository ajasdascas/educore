-- cleanup-stale-backup-jobs.sql
-- Marks backup jobs stuck in 'queued' for more than 2 hours as failed.
-- Run manually via phpMyAdmin or a migration step if needed.
-- DO NOT run automatically from the application.

UPDATE backup_jobs
SET status      = 'failed',
    error       = 'Backup job expired before execution — server may have restarted.',
    completed_at = NOW()
WHERE status = 'queued'
  AND created_at < DATE_SUB(NOW(), INTERVAL 2 HOUR);

-- Also mark 'running' jobs that have been stuck for more than 15 minutes
-- (the Go timeout is 10 minutes, so 15 is a safe recovery window):
UPDATE backup_jobs
SET status      = 'failed',
    error       = 'Backup job timed out or server restarted during execution.',
    completed_at = NOW()
WHERE status = 'running'
  AND created_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE);

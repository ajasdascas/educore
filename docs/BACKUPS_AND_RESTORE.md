# Backups and Restore — EduCore

## Overview

EduCore has a built-in backup job system that creates on-demand database dumps and stores them in object storage (Cloudflare R2 or S3-compatible). Backup jobs are created via the Super Admin dashboard and executed asynchronously.

> **Important:** The backup system supports both MySQL (production on Hostinger/Railway) and PostgreSQL (local dev). The correct dump tool is selected automatically based on the configured database driver.

---

## Requirements

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `BACKUP_STORAGE_PROVIDER` | **Yes** | `r2` or `s3` — enables backup execution. If unset, jobs are created but immediately fail with an actionable error. |
| `DATABASE_URL` | Yes | Full DB connection string (already required by the app). |
| `MYSQLDUMP_PATH` | No | Full path to `mysqldump` binary. If omitted, `mysqldump` is expected to be in `$PATH`. |
| `S3_BUCKET` / `R2_BUCKET` | Yes (for upload) | Destination bucket name. |
| `S3_ACCESS_KEY_ID` / `R2_ACCESS_KEY_ID` | Yes | Credentials for object storage. |
| `S3_SECRET_ACCESS_KEY` / `R2_SECRET_ACCESS_KEY` | Yes | Secret key. |
| `S3_ENDPOINT` / `R2_ENDPOINT` | R2/custom S3 | Custom endpoint URL (required for R2 and non-AWS S3). |

### Runtime binaries

**MySQL (production):** `mysqldump` from the `mysql-client` package.

Railway's default Go image does **not** include `mysql-client`. Options:
1. **Custom Dockerfile** — add `RUN apt-get install -y mysql-client` or `mariadb-client`.
2. **VPS deployment** — any Ubuntu/Debian VPS with `mysql-client` installed.
3. Set `MYSQLDUMP_PATH` to the binary's absolute path if installed in a non-standard location.

If `mysqldump` is not found, the job is immediately marked `failed` with the message:
```
mysqldump not available in this runtime. Railway's default Go image does not include the MySQL client...
```

**PostgreSQL (dev/staging):** `pg_dump` from the `postgresql-client` package. Only used when the driver is not MySQL.

---

## How backup jobs work

1. Super Admin clicks **Crear backup** in the dashboard.
2. The API creates a `backup_jobs` row with `status = 'queued'`.
3. `executeBackupJob` is called in a goroutine (10-minute timeout).
4. The job checks `BACKUP_STORAGE_PROVIDER` — if unset, fails immediately.
5. Based on the database driver:
   - **MySQL:** runs `mysqldump --single-transaction --routines --triggers`, gzips the output.
   - **PostgreSQL:** runs `pg_dump`, gzips the output.
6. The gzipped file is uploaded to the configured object storage bucket.
7. The job is updated to `status = 'completed'` with the file size in MB.

On any failure, the job is marked `status = 'failed'` with an error message visible in the dashboard.

---

## Stale job cleanup

If the backend process restarts while a job is `queued` or `running`, those jobs will never complete on their own. Run the cleanup script manually via phpMyAdmin or as a one-off migration step:

```bash
# Via phpMyAdmin → SQL tab, paste contents of:
scripts/cleanup-stale-backup-jobs.sql
```

The script marks:
- `queued` jobs older than **2 hours** as `failed` (server restart during queue)
- `running` jobs older than **15 minutes** as `failed` (process killed during execution; the Go timeout is 10 minutes)

> Do **not** run this script automatically from the application — it could race with legitimately running jobs.

---

## Manual restore procedure

Automatic restore is not implemented (restore is a destructive operation requiring manual supervision). The `/backups/:id/restore` endpoint only sets `status = 'restore_requested'` and logs the request for audit.

To restore manually:

1. Download the `.sql.gz` file from object storage (R2/S3 dashboard or CLI).
2. Decompress: `gunzip backup_<jobid>.sql.gz`
3. Review the SQL to confirm it targets the correct database.
4. Apply via phpMyAdmin → Import, or:
   ```bash
   mysql -h <HOST> -u <USER> -p <DBNAME> < backup_<jobid>.sql
   ```
5. Verify data integrity after restore.

---

## Dashboard error messages reference

| Error shown in dashboard | Root cause | Fix |
|---|---|---|
| `Backup storage is not configured. Set BACKUP_STORAGE_PROVIDER...` | `BACKUP_STORAGE_PROVIDER` env var missing | Set the env var on Railway/VPS and redeploy |
| `mysqldump not available in this runtime...` | No `mysql-client` in runtime | Use custom Dockerfile with `mysql-client`, or set `MYSQLDUMP_PATH` |
| `pg_dump failed: exec: "pg_dump": executable file not found` | Legacy error before MySQL fix — should not occur after deploy | Redeploy the latest backend |
| `Could not parse DATABASE_URL for mysqldump` | Unsupported `DATABASE_URL` format | Ensure URL is `mysql://user:pass@host:port/dbname` |

---

## Security

- Backup endpoints require `SUPER_ADMIN` role (enforced by Fiber middleware).
- Restore requires a confirmation text matching `RESTORE <job_id>` (prevents accidental triggers).
- Every backup and restore action is recorded in `audit_logs` with severity `critical`.
- Backup files in object storage should have private ACLs — never public-readable.
- `MYSQL_PWD` is passed via environment to `mysqldump` (not via command args) to avoid password leaking in process listings.

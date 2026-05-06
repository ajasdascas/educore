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
| `BACKUP_S3_BUCKET` | **Yes** | Bucket name in R2 or S3. |
| `BACKUP_S3_ACCESS_KEY_ID` | **Yes** | R2/S3 access key ID. |
| `BACKUP_S3_SECRET_ACCESS_KEY` | **Yes** | R2/S3 secret access key. |
| `BACKUP_S3_ENDPOINT` | R2 / custom S3 | Custom endpoint URL (required for Cloudflare R2 and non-AWS S3). Leave empty for standard AWS S3. |
| `BACKUP_S3_REGION` | No | Storage region. Defaults to `auto` (correct for Cloudflare R2). Use your AWS region for standard S3 (e.g. `us-east-1`). |
| `DATABASE_URL` | Yes | Full DB connection string (already required by the app). |
| `MYSQLDUMP_PATH` | No | Absolute path to the `mysqldump` binary. If omitted, `mysqldump` is searched in `$PATH`. |

### Runtime vs deployment secrets

- **Runtime variables** (`BACKUP_STORAGE_PROVIDER`, `BACKUP_S3_*`, `MYSQLDUMP_PATH`) are read at job-execution time, not at startup. Setting them in Railway's Variables tab or your VPS `.env` file is sufficient — no redeploy required for credential rotation.
- **GitHub Secrets** are for CI/CD only (build secrets, deploy tokens). Do **not** put R2 credentials in GitHub Secrets unless you have a CI step that specifically needs them.

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

## Cloudflare R2 — Quick Setup

1. **Create bucket:** Go to Cloudflare dashboard → R2 → Create bucket. Name it e.g. `educore-backups`.
2. **Create R2 token:** R2 → Manage R2 API tokens → Create API Token.
   - Permission: **Object Read & Write** on the `educore-backups` bucket only.
   - Copy the **Access Key ID** and **Secret Access Key** shown once.
3. **Get your account endpoint:** Format is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. Found on the R2 Overview page.
4. **Set env vars** in Railway → Variables (or your VPS `.env`):
   ```
   BACKUP_STORAGE_PROVIDER=r2
   BACKUP_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   BACKUP_S3_BUCKET=educore-backups
   BACKUP_S3_REGION=auto
   BACKUP_S3_ACCESS_KEY_ID=<your-access-key-id>
   BACKUP_S3_SECRET_ACCESS_KEY=<your-secret-access-key>
   ```
5. **Test:** In the Super Admin dashboard → Backups → Crear backup. The job should move from `queued` → `running` → `completed` in under a minute for a small DB.

---

## How backup jobs work

1. Super Admin clicks **Crear backup** in the dashboard.
2. The API creates a `backup_jobs` row with `status = 'queued'`.
3. `executeBackupJob` is called in a goroutine (10-minute timeout).
4. The job checks `BACKUP_STORAGE_PROVIDER` — if unset, fails immediately with actionable message.
5. Based on the database driver:
   - **MySQL:** runs `mysqldump --single-transaction --routines --triggers`, gzips the output.
   - **PostgreSQL:** runs `pg_dump`, gzips the output.
6. The gzipped file is uploaded to the configured bucket via AWS Signature V4 (no external SDK required — built-in implementation supports R2 path-style URLs).
7. **Only after a successful upload:** the job is updated to `status = 'completed'` with `storage_key`, `file_name`, `size_bytes`, `checksum_sha256`, and `storage_provider`.

A job is **never** marked `completed` if the upload failed or was skipped.

On any failure, the job is marked `status = 'failed'` with an error message visible in the dashboard.

---

## Download flow

Because JWT tokens are stored in `localStorage` (not in cookies), the browser cannot include the `Authorization` header on a direct `window.open` call. The download flow therefore uses two requests:

1. **Frontend → API (`authFetch`):** `GET /api/v1/super-admin/backups/:id/download-url`
   - Returns `{ url: "<15-min presigned URL>", expires_at: "..." }`.
   - This request carries the JWT in the `Authorization: Bearer` header.
2. **Frontend → R2/S3 (`window.open`):** Opens the presigned URL directly.
   - The presigned URL encodes AWS Sig V4 credentials as query parameters — no Authorization header needed.
   - Presigned URLs expire in **15 minutes**.

This pattern is the standard approach for downloading from private object storage behind a JWT-authenticated API.

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

1. Download the `.sql.gz` file from object storage (R2/S3 dashboard or CLI), or use the **Descargar** action in the Super Admin → Backups page to get a 15-min presigned URL.
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
| `Backup storage is not configured. Set BACKUP_STORAGE_PROVIDER...` | `BACKUP_STORAGE_PROVIDER` env var missing | Set the env var (and the `BACKUP_S3_*` vars) on Railway/VPS |
| `mysqldump not available in this runtime...` | No `mysql-client` in runtime | Use custom Dockerfile with `mysql-client`, or set `MYSQLDUMP_PATH` |
| `pg_dump failed: exec: "pg_dump": executable file not found` | Legacy error before MySQL fix — should not occur after deploy | Redeploy the latest backend |
| `Could not parse DATABASE_URL for mysqldump` | Unsupported `DATABASE_URL` format | Ensure URL is `mysql://user:pass@host:port/dbname` |
| `Backup file not available — storage_key is empty` | Backup was created before storage was configured | Create a new backup after configuring `BACKUP_S3_*` vars |
| `Could not generate download URL: S3/R2 credentials not configured` | `BACKUP_S3_*` vars missing at download time | Set all required `BACKUP_S3_*` env vars |

---

## Security

- Backup endpoints require `SUPER_ADMIN` role (enforced by Fiber middleware).
- Restore requires a confirmation text matching `RESTORE <job_id>` (prevents accidental triggers).
- Every backup and restore action is recorded in `audit_logs` with severity `critical`.
- Backup files in object storage should have **private ACLs** — never public-readable. Access is always via presigned URLs.
- `MYSQL_PWD` is passed via environment to `mysqldump` (not via command args) to avoid password leaking in process listings.
- Presigned download URLs expire in 15 minutes and are single-use from the user's session.

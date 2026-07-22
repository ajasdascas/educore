#!/usr/bin/env bash
# EduCore PostgreSQL migration runner.
#
# Usage:
#   ./scripts/migrate.sh up
#   MIGRATION_START_AT=020 ./scripts/migrate.sh up
#   ./scripts/migrate.sh status
#   ./scripts/migrate.sh down
#
# Files without `-- migrate:up` markers are valid migrations and are executed
# in full. MIGRATION_START_AT is intended for an existing production database
# whose historical schema predates schema_migrations; it must be set only after
# verifying that all earlier migrations are already represented in the schema.

set -euo pipefail

DIRECTION="${1:-up}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-backend/migrations}"
DB_URL="${DATABASE_URL:-}"
START_AT="${MIGRATION_START_AT:-}"

if [[ -z "${DB_URL}" ]]; then
  echo "ERROR: DATABASE_URL is required; no implicit database target is allowed."
  exit 1
fi

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
  echo "ERROR: migrations directory not found: ${MIGRATIONS_DIR}"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is required."
  exit 1
fi

PSQL=(psql "${DB_URL}" -X -v ON_ERROR_STOP=1 --no-psqlrc)

"${PSQL[@]}" -q -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);"

list_files() {
  find "${MIGRATIONS_DIR}" -maxdepth 1 -type f -name '*.sql' -print | sort
}

validate_unique_versions() {
  local duplicates
  duplicates="$(list_files | sed -E 's#^.*/([0-9]{3})[^/]*$#\1#' | sort | uniq -d)"
  if [[ -n "${duplicates}" ]]; then
    echo "ERROR: duplicate migration prefixes are not allowed: ${duplicates//$'\n'/, }"
    exit 1
  fi
}

version_is_in_range() {
  local version="$1"
  [[ -z "${START_AT}" || "${version}" > "${START_AT}" || "${version}" == "${START_AT}"* ]]
}

emit_up_sql() {
  local file="$1"
  if grep -q '^-- migrate:up' "${file}"; then
    sed -n '/^-- migrate:up/,/^-- migrate:down/p' "${file}" | sed '/^-- migrate:/d'
  else
    sed '/^-- migrate:down/,$d' "${file}"
  fi
}

apply_file() {
  local file="$1"
  local version="$2"
  {
    echo "BEGIN;"
    echo "SELECT pg_advisory_xact_lock(hashtext('educore_schema_migrations'));"
    emit_up_sql "${file}"
    printf "INSERT INTO schema_migrations (version) VALUES ('%s');\n" "${version//\'/\'\'}"
    echo "COMMIT;"
  } | "${PSQL[@]}" -q
}

validate_unique_versions

case "${DIRECTION}" in
  status)
    echo "Migration status:"
    while IFS= read -r file; do
      version="$(basename "${file}")"
      if ! version_is_in_range "${version}"; then
        continue
      fi
      applied="$("${PSQL[@]}" -tA -v migration_version="${version}" -c "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = :'migration_version');")"
      if [[ "${applied}" == "t" ]]; then
        echo "  APPLIED ${version}"
      else
        echo "  PENDING ${version}"
      fi
    done < <(list_files)
    ;;

  up)
    echo "Applying pending EduCore migrations..."
    while IFS= read -r file; do
      version="$(basename "${file}")"
      if ! version_is_in_range "${version}"; then
        continue
      fi
      applied="$("${PSQL[@]}" -tA -v migration_version="${version}" -c "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = :'migration_version');")"
      if [[ "${applied}" == "t" ]]; then
        echo "  SKIP ${version}"
        continue
      fi
      echo "  APPLY ${version}"
      apply_file "${file}" "${version}"
    done < <(list_files)
    echo "Migrations completed."
    ;;

  down)
    last="$("${PSQL[@]}" -tA -c "SELECT version FROM schema_migrations ORDER BY applied_at DESC, version DESC LIMIT 1;")"
    if [[ -z "${last}" ]]; then
      echo "No applied migration found."
      exit 0
    fi
    file="${MIGRATIONS_DIR}/${last}"
    if [[ ! -f "${file}" ]] || ! grep -q '^-- migrate:down' "${file}"; then
      echo "ERROR: ${last} has no explicit down migration; automatic rollback is refused."
      exit 1
    fi
    {
      echo "BEGIN;"
      echo "SELECT pg_advisory_xact_lock(hashtext('educore_schema_migrations'));"
      sed -n '/^-- migrate:down/,$p' "${file}" | sed '/^-- migrate:down/d'
      printf "DELETE FROM schema_migrations WHERE version = '%s';\n" "${last//\'/\'\'}"
      echo "COMMIT;"
    } | "${PSQL[@]}" -q
    echo "Rolled back ${last}."
    ;;

  *)
    echo "Usage: ./scripts/migrate.sh [up|status|down]"
    exit 1
    ;;
esac

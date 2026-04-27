#!/bin/bash
# scripts/migrate.sh
# Uso: ./scripts/migrate.sh up   → aplica migraciones pendientes
#       ./scripts/migrate.sh down → revierte la última migración

set -e

DIRECTION="${1:-up}"
MIGRATIONS_DIR="backend/migrations"
DB_URL="${DATABASE_URL:-postgres://educore:educore_dev_password@localhost:5432/educore_dev?sslmode=disable}"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "❌ Directorio de migraciones no encontrado: $MIGRATIONS_DIR"
  exit 1
fi

# Crear tabla de control de migraciones si no existe
psql "$DB_URL" -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);" 2>/dev/null

if [ "$DIRECTION" = "up" ]; then
  echo "🗄️  Aplicando migraciones pendientes..."
  
  for file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
    VERSION=$(basename "$file")
    
    ALREADY=$(psql "$DB_URL" -tAc "SELECT 1 FROM schema_migrations WHERE version='$VERSION'" 2>/dev/null)
    
    if [ "$ALREADY" != "1" ]; then
      echo "  ⬆ Aplicando: $VERSION"
      # Extraer solo la parte -- migrate:up
      sed -n '/-- migrate:up/,/-- migrate:down/p' "$file" | grep -v "^-- migrate:" | psql "$DB_URL" -f -
      psql "$DB_URL" -c "INSERT INTO schema_migrations (version) VALUES ('$VERSION');" 2>/dev/null
    else
      echo "  ✓ Ya aplicada: $VERSION"
    fi
  done
  
  echo "✅ Migraciones completadas"

elif [ "$DIRECTION" = "down" ]; then
  echo "🗄️  Revirtiendo última migración..."
  
  LAST=$(psql "$DB_URL" -tAc "SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1" 2>/dev/null)
  
  if [ -z "$LAST" ]; then
    echo "ℹ️  No hay migraciones para revertir"
    exit 0
  fi
  
  FILE="$MIGRATIONS_DIR/$LAST"
  if [ -f "$FILE" ]; then
    echo "  ⬇ Revirtiendo: $LAST"
    sed -n '/-- migrate:down/,$p' "$FILE" | grep -v "^-- migrate:" | psql "$DB_URL" -f -
    psql "$DB_URL" -c "DELETE FROM schema_migrations WHERE version='$LAST';" 2>/dev/null
    echo "✅ Migración revertida: $LAST"
  else
    echo "❌ Archivo de migración no encontrado: $FILE"
    exit 1
  fi

else
  echo "Uso: ./scripts/migrate.sh [up|down]"
  exit 1
fi

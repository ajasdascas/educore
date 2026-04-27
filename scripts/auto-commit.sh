#!/bin/bash
# scripts/auto-commit.sh
# Uso: ./scripts/auto-commit.sh "descripción del cambio"
# O simplemente: ./scripts/auto-commit.sh (genera mensaje automáticamente)

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
OBSIDIAN_DIR="$REPO_ROOT/docs/obsidian"
CHANGES_FILE="$OBSIDIAN_DIR/CAMBIOS_RECIENTES.md"
DATE=$(date '+%Y-%m-%d %H:%M')

# ───────────────────────────────────────
# 1. Determinar mensaje de commit
# ───────────────────────────────────────
if [ -n "$1" ]; then
  COMMIT_MSG="$1"
else
  # Auto-generar basado en archivos cambiados
  CHANGED=$(git diff --cached --name-only 2>/dev/null || git diff --name-only HEAD)
  
  if echo "$CHANGED" | grep -q "backend/"; then
    COMMIT_MSG="chore(backend): update backend code"
  elif echo "$CHANGED" | grep -q "frontend/"; then
    COMMIT_MSG="chore(frontend): update frontend code"
  elif echo "$CHANGED" | grep -q "migrations/"; then
    COMMIT_MSG="chore(db): add migration"
  elif echo "$CHANGED" | grep -q "docs/obsidian/"; then
    COMMIT_MSG="docs: update project memory"
  else
    COMMIT_MSG="chore: general update"
  fi
fi

# ───────────────────────────────────────
# 2. Actualizar CAMBIOS_RECIENTES.md en Obsidian
# ───────────────────────────────────────
if [ -f "$CHANGES_FILE" ]; then
  CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null | head -20 | tr '\n' ', ')
  
  NEW_ENTRY="
## [$DATE] — $COMMIT_MSG
- Archivos: \`$CHANGED_FILES\`
- Commit automático desde: \`auto-commit.sh\`
"
  
  # Insertar al principio del archivo (después del título)
  TEMP=$(mktemp)
  head -3 "$CHANGES_FILE" > "$TEMP"
  echo "$NEW_ENTRY" >> "$TEMP"
  tail -n +4 "$CHANGES_FILE" >> "$TEMP"
  mv "$TEMP" "$CHANGES_FILE"
  
  echo "✅ Obsidian actualizado: CAMBIOS_RECIENTES.md"
fi

# ───────────────────────────────────────
# 3. Copiar docs/obsidian a tu vault de Obsidian local (si existe)
# ───────────────────────────────────────
OBSIDIAN_LOCAL="${OBSIDIAN_VAULT_PATH:-}"
if [ -n "$OBSIDIAN_LOCAL" ] && [ -d "$OBSIDIAN_LOCAL" ]; then
  cp -r "$OBSIDIAN_DIR/"* "$OBSIDIAN_LOCAL/EduCore/" 2>/dev/null || true
  echo "✅ Sincronizado con Obsidian local: $OBSIDIAN_LOCAL/EduCore/"
fi

# ───────────────────────────────────────
# 4. Git add + commit + push
# ───────────────────────────────────────
cd "$REPO_ROOT"

git add -A

if git diff --cached --quiet; then
  echo "ℹ️  Sin cambios para commitear"
  exit 0
fi

git commit -m "$COMMIT_MSG

🤖 Auto-committed by EduCore AI Agent
📅 $DATE"

# Push si hay remote configurado
if git remote get-url origin &>/dev/null; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  git push origin "$BRANCH"
  echo "✅ Push a GitHub: $BRANCH"
fi

echo ""
echo "✅ Commit completado: $COMMIT_MSG"

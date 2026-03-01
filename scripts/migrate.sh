#!/usr/bin/env bash
# ============================================================================
# HeyPoco — Database Migration Runner
# ============================================================================
# Runs all SQL files in supabase/migrations/ in order against Supabase.
#
# Requires:
#   DATABASE_URL in backend/.env  (or exported in your shell)
#
# Usage:
#   pnpm db:migrate
#   # or directly:
#   bash scripts/migrate.sh
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
ENV_FILE="$ROOT_DIR/backend/.env"

# ── Load DATABASE_URL from backend/.env if not already set ─────────────────
if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f "$ENV_FILE" ]]; then
    export $(grep -E '^DATABASE_URL=' "$ENV_FILE" | xargs)
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo ""
  echo "  ERROR: DATABASE_URL is not set."
  echo ""
  echo "  Add it to backend/.env:"
  echo "    DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
  echo ""
  echo "  Find it in: Supabase Dashboard → Settings → Database → Connection string → URI"
  echo ""
  exit 1
fi

# ── Run migrations in order ─────────────────────────────────────────────────
echo ""
echo "Running HeyPoco migrations..."
echo ""

shopt -s nullglob
MIGRATION_FILES=("$MIGRATIONS_DIR"/*.sql)

if [[ ${#MIGRATION_FILES[@]} -eq 0 ]]; then
  echo "No migration files found in $MIGRATIONS_DIR"
  exit 1
fi

for file in "${MIGRATION_FILES[@]}"; do
  filename=$(basename "$file")
  echo "  → Applying $filename..."
  psql "$DATABASE_URL" -f "$file" --single-transaction -v ON_ERROR_STOP=1 -q
  echo "    ✓ Done"
done

echo ""
echo "All migrations applied successfully."
echo ""

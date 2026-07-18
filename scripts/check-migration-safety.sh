#!/usr/bin/env bash
set -euo pipefail

SCHEMA_PATH="${1:-prisma/schema.prisma}"
MIGRATIONS_DIR="${2:-prisma/migrations}"

if [ ! -f "$SCHEMA_PATH" ]; then
  echo "ERROR: schema file not found: $SCHEMA_PATH" >&2
  exit 1
fi
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "ERROR: migrations directory not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

echo "== Migration Safety Check =="
echo "Schema: $SCHEMA_PATH"
echo "Migrations: $MIGRATIONS_DIR"

# 1) Validate Prisma schema syntax + semantics.
pnpm exec prisma validate --schema "$SCHEMA_PATH" >/tmp/prisma-validate.out 2>/tmp/prisma-validate.err || {
  echo "FAIL: prisma validate failed" >&2
  sed -n '1,120p' /tmp/prisma-validate.err >&2 || true
  exit 1
}
echo "PASS: prisma schema validates"

# 2) Basic migration structure checks.
missing=0
invalid_name=0
while IFS= read -r -d '' dir; do
  base="$(basename "$dir")"
  if ! [[ "$base" =~ ^([0-9]{14}|[0-9]{8})_[a-z0-9_]+$ ]]; then
    echo "FAIL: invalid migration directory name: $base" >&2
    echo "      expected: <YYYYMMDDHHMMSS|YYYYMMDD>_<lower_snake_case>" >&2
    invalid_name=1
  fi
  if [ ! -f "$dir/migration.sql" ]; then
    echo "FAIL: missing migration.sql in $dir" >&2
    missing=1
  fi
done < <(find "$MIGRATIONS_DIR" -mindepth 1 -maxdepth 1 -type d -print0)

if [ "$missing" -ne 0 ] || [ "$invalid_name" -ne 0 ]; then
  exit 1
fi
echo "PASS: migration directory names and migration.sql files are valid"

# 3) Heuristic guardrail for destructive SQL ops.
# Allow explicit opt-in by placing '-- approved-destructive' in the migration file.
# Keep the pattern simple and grep-compatible (ERE); avoid \b token pitfalls.
destructive_pattern='DROP[[:space:]]+TABLE|DROP[[:space:]]+COLUMN|TRUNCATE([[:space:]]+TABLE)?|DELETE[[:space:]]+FROM'
found=0
while IFS= read -r -d '' file; do
  if grep -Eiq "$destructive_pattern" "$file"; then
    if grep -Eiq -- '--[[:space:]]*approved-destructive' "$file"; then
      echo "WARN: destructive SQL with explicit approval marker in $file"
    else
      echo "FAIL: potential destructive SQL without approval marker in $file" >&2
      grep -Ein "$destructive_pattern" "$file" >&2 || true
      found=1
    fi
  fi
done < <(find "$MIGRATIONS_DIR" -type f -name 'migration.sql' -print0)

if [ "$found" -ne 0 ]; then
  echo "Hint: add '-- approved-destructive' with justification comment, or redesign migration." >&2
  exit 1
fi

echo "PASS: no unapproved destructive SQL patterns detected"

# 4) Schema-vs-migrations drift check (needs a real Postgres as shadow DB).
# Gated on SHADOW_DATABASE_URL: CI's qa job provides one; the deploy workflow
# runs this script with a dummy database URL and must skip the diff.
if [ -n "${SHADOW_DATABASE_URL:-}" ]; then
  set +e
  pnpm exec prisma migrate diff \
    --from-migrations "$MIGRATIONS_DIR" \
    --to-schema-datamodel "$SCHEMA_PATH" \
    --shadow-database-url "$SHADOW_DATABASE_URL" \
    --exit-code >/tmp/prisma-drift.out 2>&1
  drift_status=$?
  set -e
  case "$drift_status" in
    0)
      echo "PASS: schema matches migration history (no drift)"
      ;;
    2)
      echo "FAIL: schema.prisma and $MIGRATIONS_DIR have diverged — generate a migration" >&2
      sed -n '1,120p' /tmp/prisma-drift.out >&2 || true
      exit 1
      ;;
    *)
      echo "FAIL: prisma migrate diff errored (exit $drift_status)" >&2
      sed -n '1,120p' /tmp/prisma-drift.out >&2 || true
      exit 1
      ;;
  esac
else
  echo "SKIP: schema drift check (SHADOW_DATABASE_URL not set)"
fi

echo "Migration safety checks passed."

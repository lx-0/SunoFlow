#!/usr/bin/env bash
# restore-db.sh — Restore a pg_dump backup and verify key table row counts
#
# Usage:
#   DATABASE_URL=postgres://user:pass@host:5432/dbname \
#     ./scripts/restore-db.sh <backup-file> [--target-db <dbname>]
#
# Options:
#   --target-db <name>   Restore into this database instead of a temp db.
#                        WARNING: this drops and recreates the target database.
#                        If omitted, a temporary database named sunoflow_restore_verify
#                        is created and dropped after verification.
#
# Exit codes:
#   0  — restore + verification succeeded
#   1  — any error (pg_restore failure, verification failure, etc.)

set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { echo "[restore-db] $*" >&2; }
die()  { echo "[restore-db] ERROR: $*" >&2; exit 1; }
pass() { echo "[restore-db] PASS: $*" >&2; }
fail() { echo "[restore-db] FAIL: $*" >&2; VERIFY_FAILED=1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
BACKUP_FILE=""
TARGET_DB=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target-db)
      TARGET_DB="${2:-}"
      shift 2
      ;;
    -*)
      die "Unknown option: $1"
      ;;
    *)
      [[ -n "$BACKUP_FILE" ]] && die "Too many positional arguments"
      BACKUP_FILE="$1"
      shift
      ;;
  esac
done

[[ -z "$BACKUP_FILE" ]] && die "Usage: $0 <backup-file> [--target-db <dbname>]"
[[ -f "$BACKUP_FILE" ]]  || die "Backup file not found: $BACKUP_FILE"
[[ -z "${DATABASE_URL:-}" ]] && die "DATABASE_URL is not set"

require_cmd pg_restore
require_cmd psql

# ---------------------------------------------------------------------------
# Parse DATABASE_URL for superuser connection (connect to postgres db)
# ---------------------------------------------------------------------------
# Expected format: postgres://user:pass@host:port/dbname
DB_PROTO="${DATABASE_URL%%://*}"
DB_REST="${DATABASE_URL#*://}"
DB_USERPASS="${DB_REST%%@*}"
DB_HOSTPORTNAME="${DB_REST#*@}"
DB_USER="${DB_USERPASS%%:*}"
DB_PASS="${DB_USERPASS#*:}"
DB_HOSTPORT="${DB_HOSTPORTNAME%%/*}"
DB_HOST="${DB_HOSTPORT%%:*}"
DB_PORT="${DB_HOSTPORT##*:}"
[[ "$DB_PORT" == "$DB_HOST" ]] && DB_PORT="5432"   # no port in URL

# Database to drop/create
if [[ -n "$TARGET_DB" ]]; then
  RESTORE_DB="$TARGET_DB"
  CLEANUP_DB=false
else
  RESTORE_DB="sunoflow_restore_verify"
  CLEANUP_DB=true
fi

ADMIN_URL="${DB_PROTO}://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/postgres"
RESTORE_URL="${DB_PROTO}://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${RESTORE_DB}"

VERIFY_FAILED=0

cleanup() {
  if [[ "$CLEANUP_DB" == "true" ]]; then
    log "Dropping temporary database: $RESTORE_DB"
    PGPASSWORD="$DB_PASS" psql "$ADMIN_URL" \
      -c "DROP DATABASE IF EXISTS \"${RESTORE_DB}\";" \
      >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# (Re)create the target database
# ---------------------------------------------------------------------------
log "Dropping database (if exists): $RESTORE_DB"
PGPASSWORD="$DB_PASS" psql "$ADMIN_URL" \
  -c "DROP DATABASE IF EXISTS \"${RESTORE_DB}\";" \
  >/dev/null || die "Could not drop database $RESTORE_DB"

log "Creating database: $RESTORE_DB"
PGPASSWORD="$DB_PASS" psql "$ADMIN_URL" \
  -c "CREATE DATABASE \"${RESTORE_DB}\" OWNER \"${DB_USER}\";" \
  >/dev/null || die "Could not create database $RESTORE_DB"

# ---------------------------------------------------------------------------
# Restore
# ---------------------------------------------------------------------------
log "Restoring backup: $BACKUP_FILE → $RESTORE_DB"
PGPASSWORD="$DB_PASS" pg_restore \
  --no-password \
  --dbname="$RESTORE_URL" \
  --no-owner \
  --role="$DB_USER" \
  --exit-on-error \
  "$BACKUP_FILE" \
  || die "pg_restore failed"

log "Restore complete."

# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------
log ""
log "=== Verification Report ==="
log ""

run_query() {
  local label="$1"
  local sql="$2"
  PGPASSWORD="$DB_PASS" psql "$RESTORE_URL" -t -A -c "$sql" 2>/dev/null || echo "ERROR"
}

verify_table() {
  local table="$1"
  local min_rows="${2:-0}"
  local count
  count=$(run_query "$table" "SELECT COUNT(*) FROM \"${table}\";")
  if [[ "$count" == "ERROR" ]]; then
    fail "Table $table: query error"
  elif (( count >= min_rows )); then
    pass "Table $table: $count rows (>= $min_rows expected)"
  else
    fail "Table $table: $count rows (expected >= $min_rows)"
  fi
  printf "  %-35s %s rows\n" "$table" "$count"
}

# Key tables — min_rows=0 means "table exists and is queryable" (row count may
# legitimately be 0 in a fresh or test database)
KEY_TABLES=(
  User
  Song
  Playlist
  PlaylistSong
  Subscription
  CreditUsage
  GenerationQueueItem
  Activity
  Comment
  Follow
  Favorite
  Tag
  PromptTemplate
  Persona
  ApiKey
)

printf "  %-35s %s\n" "Table" "Row count"
printf "  %-35s %s\n" "-----" "---------"
for tbl in "${KEY_TABLES[@]}"; do
  verify_table "$tbl" 0
done

# Also verify _prisma_migrations exists (schema integrity check)
migration_count=$(run_query "_prisma_migrations" "SELECT COUNT(*) FROM \"_prisma_migrations\";")
if [[ "$migration_count" == "ERROR" ]]; then
  fail "_prisma_migrations table missing — schema may be corrupt"
else
  pass "_prisma_migrations: $migration_count migration records"
  printf "  %-35s %s rows\n" "_prisma_migrations" "$migration_count"
fi

log ""
if (( VERIFY_FAILED == 0 )); then
  log "=== All checks passed. Backup is valid. ==="
  exit 0
else
  log "=== One or more checks FAILED. Review output above. ==="
  exit 1
fi

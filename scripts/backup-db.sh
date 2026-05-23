#!/usr/bin/env bash
# backup-db.sh — PostgreSQL backup with rotation
#
# Usage:
#   DATABASE_URL=postgres://user:pass@host:5432/dbname ./scripts/backup-db.sh
#
# Optional env vars:
#   BACKUP_DIR   — local directory for backups (default: ./backups)
#   S3_BUCKET    — s3://bucket/prefix for production uploads (skipped if unset)
#   AWS_PROFILE  — AWS CLI profile to use (optional)
#
# Rotation policy (applied to local BACKUP_DIR):
#   Daily   — keep last 7
#   Weekly  — keep last 4 (taken on Sunday)
#   Monthly — keep last 3 (taken on the 1st)

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BACKUP_DIR="${BACKUP_DIR:-./backups}"
S3_BUCKET="${S3_BUCKET:-}"

NOW=$(date -u +"%Y%m%dT%H%M%SZ")
DOW=$(date -u +"%u")   # 1=Mon … 7=Sun
DOM=$(date -u +"%d")   # day of month, zero-padded

# Determine backup tier label (used in filename and rotation)
if [[ "$DOM" == "01" ]]; then
  TIER="monthly"
elif [[ "$DOW" == "7" ]]; then
  TIER="weekly"
else
  TIER="daily"
fi

BACKUP_FILE="${BACKUP_DIR}/${TIER}_${NOW}.pgdump"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log() { echo "[backup-db] $*" >&2; }

die() {
  echo "[backup-db] ERROR: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

# ---------------------------------------------------------------------------
# Validate environment
# ---------------------------------------------------------------------------
[[ -z "${DATABASE_URL:-}" ]] && die "DATABASE_URL is not set"
require_cmd pg_dump

# ---------------------------------------------------------------------------
# Create backup directory
# ---------------------------------------------------------------------------
mkdir -p "$BACKUP_DIR" || die "Cannot create backup directory: $BACKUP_DIR"

# ---------------------------------------------------------------------------
# Run pg_dump
# ---------------------------------------------------------------------------
log "Starting $TIER backup → $BACKUP_FILE"

pg_dump \
  --format=custom \
  --compress=9 \
  --no-password \
  "$DATABASE_URL" \
  --file="$BACKUP_FILE" \
  || die "pg_dump failed"

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
log "Backup complete: $BACKUP_FILE ($BACKUP_SIZE)"

# ---------------------------------------------------------------------------
# Upload to S3 (if configured)
# ---------------------------------------------------------------------------
if [[ -n "$S3_BUCKET" ]]; then
  require_cmd aws
  S3_KEY="${S3_BUCKET%/}/${TIER}_${NOW}.pgdump"
  log "Uploading to $S3_KEY"
  aws s3 cp "$BACKUP_FILE" "$S3_KEY" \
    ${AWS_PROFILE:+--profile "$AWS_PROFILE"} \
    --storage-class STANDARD_IA \
    || die "S3 upload failed"
  log "Upload complete: $S3_KEY"
fi

# ---------------------------------------------------------------------------
# Rotate local backups
# ---------------------------------------------------------------------------
rotate() {
  local prefix="$1"
  local keep="$2"
  local -a files=()
  local file
  local i

  # List files newest-first, keep the newest $keep, delete the rest.
  shopt -s nullglob
  for file in "${BACKUP_DIR}/${prefix}"_*.pgdump; do
    files+=("$file")
  done
  shopt -u nullglob

  if (( ${#files[@]} == 0 )); then
    return
  fi

  local -a sorted_files=()
  mapfile -t sorted_files < <(ls -1t -- "${files[@]}")
  files=("${sorted_files[@]}")

  for ((i = keep; i < ${#files[@]}; i++)); do
    log "Rotating out: ${files[$i]}"
    rm -f "${files[$i]}"
  done
}

rotate "daily"   7
rotate "weekly"  4
rotate "monthly" 3

log "Rotation complete."
log "Done."

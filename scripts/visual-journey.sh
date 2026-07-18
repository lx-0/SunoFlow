#!/usr/bin/env bash
set -euo pipefail

# Visual verification harness — full-surface screenshot run against a local
# PROD build with a throwaway DB and the keyless mock-generate path.
#
# Encodes the repo's verified local prod-run recipe (.ytstack/KNOWLEDGE.md):
#   - `next start` must bind 0.0.0.0:80 — any other port triggers the
#     middleware port-strip self-redirect (normalizeRedirectLocation), and
#     `next dev` dies with EMFILE. macOS allows the unprivileged :80 bind on
#     0.0.0.0 (NOT on 127.0.0.1).
#   - PLAYWRIGHT_TEST=true at BUILD time disables standalone output so
#     `next start` works; at RUN time it enables /api/test/login, skips the
#     register rate-limit + invite gate, and disables the sliding-window limiter.
#   - SUNOAPI_KEY is pinned to "" so /api/generate takes the keyless mock
#     branch (instantly-ready Song rows, zero paid calls). Exporting the empty
#     string beats a SUNOAPI_KEY in .env because @next/env never overrides
#     vars already present in the environment.
#
# Usage:
#   bash scripts/visual-journey.sh                  # label "current"
#   VISUAL_LABEL=baseline bash scripts/visual-journey.sh
#   SEED_MODE=rich bash scripts/visual-journey.sh   # varied titles via Prisma seed
#   SKIP_BUILD=true bash scripts/visual-journey.sh  # reuse existing .next (must be
#                                                   # a PLAYWRIGHT_TEST=true build)
#   KEEP_DB=true bash scripts/visual-journey.sh     # keep the throwaway DB container
#
# Output: visual-artifacts/<VISUAL_LABEL>/{visual-desktop,visual-mobile}/*.png
# Diff:   node scripts/visual-diff.mjs   (informational, see e2e/visual/README.md)
#
# NOTE: overwrites .next with a PLAYWRIGHT_TEST build and briefly owns
# 0.0.0.0:80 and (by default) localhost:5433. Aborts if either is taken.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VISUAL_LABEL="${VISUAL_LABEL:-current}"
SEED_MODE="${SEED_MODE:-}"
VISUAL_DB_PORT="${VISUAL_DB_PORT:-5433}"
DB_CONTAINER="sf-visual-db"
DB_URL="postgres://projects:projects@localhost:${VISUAL_DB_PORT}/sunoflow"
VISUAL_EMAIL="${VISUAL_EMAIL:-}"
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    # Children first: if the parent dies first they re-parent and keep :80 bound.
    pkill -TERM -P "$SERVER_PID" 2>/dev/null || true
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  if [[ "${KEEP_DB:-}" != "true" ]]; then
    docker rm -f "$DB_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

command -v docker >/dev/null || { echo "docker is required"; exit 1; }

# Refuse to fight over port 80 — never kill someone else's server.
if curl -sf -o /dev/null --max-time 2 "http://127.0.0.1/"; then
  echo "Something already answers on http://127.0.0.1:80 — stop it first (this script never kills foreign processes)."
  exit 1
fi

# ── 1. Throwaway Postgres (matches .env.example: port 5433, user 'projects' —
#       deliberately NOT the compose db on 5432/'sunoflow') ──────────────────
docker rm -f "$DB_CONTAINER" >/dev/null 2>&1 || true
if ! docker run -d --name "$DB_CONTAINER" \
  -e POSTGRES_USER=projects -e POSTGRES_PASSWORD=projects -e POSTGRES_DB=sunoflow \
  -p "${VISUAL_DB_PORT}:5432" postgres:16-alpine >/dev/null; then
  echo "Failed to start throwaway DB — is port ${VISUAL_DB_PORT} taken? Override with VISUAL_DB_PORT=<port>."
  exit 1
fi
echo "Waiting for throwaway Postgres on :${VISUAL_DB_PORT} ..."
for _ in $(seq 1 60); do
  if docker exec "$DB_CONTAINER" pg_isready -U projects -d sunoflow >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$DB_CONTAINER" pg_isready -U projects -d sunoflow >/dev/null

export DATABASE_URL="$DB_URL"
export SUNOFLOW_DATABASE_URL="$DB_URL"
export AUTH_SECRET="${AUTH_SECRET:-visual-journey-local-secret}"

pnpm exec prisma migrate deploy

# ── 2. Optional rich seed: varied titles/genres/lyrics via Prisma ────────────
if [[ "$SEED_MODE" == "rich" ]]; then
  VISUAL_EMAIL="${VISUAL_EMAIL:-visual-journey@test.local}"
  # npx tsx: repo pattern for one-off Prisma scripts (see migrate-free-subscriptions.ts)
  npx tsx scripts/seed-visual-library.ts --email "$VISUAL_EMAIL"
fi

# ── 3. Prod build (PLAYWRIGHT_TEST=true → no standalone output) ──────────────
if [[ "${SKIP_BUILD:-}" != "true" ]]; then
  PLAYWRIGHT_TEST=true SUNOAPI_KEY="" pnpm build
fi

# ── 4. Keyless port-80 prod server ───────────────────────────────────────────
# node_modules/.bin/next directly (not `pnpm exec`): the pnpm wrapper would sit
# between us and the node process, and killing the wrapper can orphan the
# server on port 80 (same reason the local-dev recipe bypasses the wrapper).
SUNOAPI_KEY="" PLAYWRIGHT_TEST=true NODE_ENV=production \
  AUTH_URL="http://127.0.0.1" \
  node_modules/.bin/next start -p 80 -H 0.0.0.0 &
SERVER_PID=$!

echo "Waiting for the server on http://127.0.0.1/api/health ..."
HEALTHY=false
for _ in $(seq 1 90); do
  if curl -sf -o /dev/null "http://127.0.0.1/api/health"; then HEALTHY=true; break; fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then break; fi
  sleep 1
done
if [[ "$HEALTHY" != "true" ]]; then
  echo "Server never became healthy on port 80 (on Linux the unprivileged :80 bind needs sudo/cap_net_bind_service)."
  exit 1
fi

# ── 5. Run the journey ───────────────────────────────────────────────────────
# Stale shared-user creds silently break global-setup reuse against a fresh DB;
# the journey spec self-registers, but clear the file anyway so a later normal
# E2E run doesn't inherit a user that only exists in the throwaway DB.
rm -f e2e/.shared-user.json
mkdir -p visual-artifacts
# Keep raw artifacts out of git without touching the root .gitignore.
printf '*\n' > visual-artifacts/.gitignore

PLAYWRIGHT_REMOTE=true BASE_URL=http://127.0.0.1 \
  VISUAL_LABEL="$VISUAL_LABEL" SEED_MODE="$SEED_MODE" VISUAL_EMAIL="$VISUAL_EMAIL" \
  pnpm exec playwright test --config=playwright.visual.config.ts "$@"

echo ""
echo "Screenshots: visual-artifacts/${VISUAL_LABEL}/{visual-desktop,visual-mobile}/"
echo "Diff against the committed baseline: node scripts/visual-diff.mjs --current visual-artifacts/${VISUAL_LABEL}"

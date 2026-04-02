#!/usr/bin/env bash
set -euo pipefail

# Cleanup script for SUNAA-155
# Removes bad DB artifacts created by incorrect SUNAA-153 scripts:
#   1. user_subscriptions table (does not belong in schema)
#   2. plan column on "User" table (app uses Subscription table with tier enum)
#
# Usage: ./scripts/cleanup-bad-artifacts.sh <DATABASE_URL>

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <DATABASE_URL>"
  echo "Example: $0 \"postgresql://user:pass@host:5432/sunoflow\""
  exit 1
fi

DB="$1"

echo "==> Checking for bad artifacts..."

echo "--- Checking user_subscriptions table ---"
EXISTS_TABLE=$(psql "$DB" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_subscriptions');")
echo "user_subscriptions exists: $EXISTS_TABLE"

echo "--- Checking plan column on User table ---"
EXISTS_COL=$(psql "$DB" -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'plan');")
echo "User.plan column exists: $EXISTS_COL"

if [ "$EXISTS_TABLE" = "f" ] && [ "$EXISTS_COL" = "f" ]; then
  echo "==> No bad artifacts found. Database is clean."
  exit 0
fi

echo ""
echo "==> Cleaning up..."

if [ "$EXISTS_TABLE" = "t" ]; then
  echo "--- Dropping user_subscriptions table ---"
  psql "$DB" -c 'DROP TABLE IF EXISTS user_subscriptions;'
  echo "Done."
fi

if [ "$EXISTS_COL" = "t" ]; then
  echo "--- Dropping plan column from User table ---"
  psql "$DB" -c 'ALTER TABLE "User" DROP COLUMN IF EXISTS "plan";'
  echo "Done."
fi

echo ""
echo "==> Verifying cleanup..."

EXISTS_TABLE=$(psql "$DB" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_subscriptions');")
EXISTS_COL=$(psql "$DB" -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'plan');")

echo "user_subscriptions exists: $EXISTS_TABLE (should be f)"
echo "User.plan column exists: $EXISTS_COL (should be f)"

echo ""
echo "==> Verifying Subscription table is sole source of truth..."
SUB_COUNT=$(psql "$DB" -tAc "SELECT COUNT(*) FROM \"Subscription\";")
echo "Subscription table rows: $SUB_COUNT"

echo ""
echo "==> Cleanup complete."

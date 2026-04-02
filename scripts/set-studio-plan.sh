#!/usr/bin/env bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <DATABASE_URL>"
  echo "Example: $0 \"postgresql://user:pass@host:5432/dbname\""
  exit 1
fi

DB="$1"

echo "==> Cleaning up leftover artifacts from earlier bad scripts..."
psql "$DB" -c 'DROP TABLE IF EXISTS user_subscriptions;'
psql "$DB" -c 'ALTER TABLE "User" DROP COLUMN IF EXISTS "plan";'

echo "==> Setting studio plan for alex@yesterday-ai.de..."
psql "$DB" <<'SQL'
INSERT INTO "Subscription" (
  "id", "userId", "stripeCustomerId", "stripeSubscriptionId",
  "stripePriceId", "tier", "status",
  "currentPeriodStart", "currentPeriodEnd",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, u.id,
  'admin_' || u.id,
  'admin_sub_' || u.id || '_' || extract(epoch from now())::bigint,
  'admin_studio', 'studio', 'active',
  now(), now() + interval '1 year', now(), now()
FROM "User" u WHERE u.email = 'alex@yesterday-ai.de'
ON CONFLICT ("userId") DO UPDATE SET
  "tier" = 'studio', "status" = 'active',
  "currentPeriodStart" = now(),
  "currentPeriodEnd" = now() + interval '1 year',
  "updatedAt" = now();
SQL

echo "==> Setting studio plan for sidney@yesterdai-ai.de..."
psql "$DB" <<'SQL'
INSERT INTO "Subscription" (
  "id", "userId", "stripeCustomerId", "stripeSubscriptionId",
  "stripePriceId", "tier", "status",
  "currentPeriodStart", "currentPeriodEnd",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, u.id,
  'admin_' || u.id,
  'admin_sub_' || u.id || '_' || extract(epoch from now())::bigint,
  'admin_studio', 'studio', 'active',
  now(), now() + interval '1 year', now(), now()
FROM "User" u WHERE u.email = 'sidney@yesterdai-ai.de'
ON CONFLICT ("userId") DO UPDATE SET
  "tier" = 'studio', "status" = 'active',
  "currentPeriodStart" = now(),
  "currentPeriodEnd" = now() + interval '1 year',
  "updatedAt" = now();
SQL

echo "==> Verifying..."
psql "$DB" <<'SQL'
SELECT u.email, s.tier, s.status, s."currentPeriodEnd"
FROM "Subscription" s
JOIN "User" u ON u.id = s."userId"
WHERE u.email IN ('alex@yesterday-ai.de', 'sidney@yesterdai-ai.de');
SQL

echo "Done. Both users now have studio plan (active, 1-year period)."

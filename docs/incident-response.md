# Incident Response

Quick reference for triaging and resolving SunoFlow production incidents.

---

## Severity Levels

| Level | Definition | Response Time |
|-------|-----------|---------------|
| **P1 — Critical** | Site down, auth broken, data loss risk | Immediate |
| **P2 — High** | Core feature broken (generation fails for all users, payments down) | < 1 hour |
| **P3 — Medium** | Degraded performance, partial feature failure, single-user data issue | < 4 hours |
| **P4 — Low** | Cosmetic issues, non-critical feature degraded | Next business day |

---

## Alert Triage

### Sentry Alerts

| Alert | Meaning | First steps |
|-------|---------|-------------|
| Error spike (>10/hour) | Recurring unhandled exception | Check Sentry for the top error, correlate with recent deploy |
| New unhandled exception | Novel crash path | Read the stack trace and breadcrumbs; check for deploy correlation |
| p95 latency > 3000ms | Slow transactions | Check `/api/health` for DB status and queue depth; check Railway metrics |
| High error rate (>50/5min) | Widespread failure | Check if it's a single endpoint; check downstream services (Suno API, DB) |

### Health Endpoint

```bash
curl https://<service-url>/api/health
```

Healthy response:
```json
{
  "status": "ok",
  "db": true,
  "uptime": 3600,
  "generation": {
    "queueDepth": 0,
    "total": 150,
    "completed": 148,
    "failed": 2
  },
  "jobs": [...]
}
```

- `status: "error"` / `db: false` → database connection down (P1)
- `queueDepth` growing without shrinking → generation worker stuck (P2)
- `jobs[*].lastRun.success: false` → scheduled job failing (P3)

### Railway Logs

```bash
# Production logs (last 100 lines)
railway logs --service SunoFlow --tail 100

# Filter for errors only
railway logs --service SunoFlow --tail 200 | grep '"level":"error"'
```

---

## Common Failure Scenarios

### 1. App is returning 503 / health check failing

**Cause:** Database connection down, or the container failed to start.

**Steps:**
1. Check Railway dashboard for the service status — is the container running?
2. `curl https://<service-url>/api/health` — if `db: false`, the Postgres service may be down or the connection string is wrong.
3. Check Railway → Database service → is it healthy?
4. Check recent deploys — did a bad migration break the schema?
5. If a recent migration caused it, roll back: see [Rollback Procedure](./deployment-runbook.md#rollback-procedure) and [Database Migration Rollback](./deployment-runbook.md#database-migration-rollback).

**Fix:** Restart the Railway service or redeploy the last good image.

---

### 2. Music generation is failing for all users

**Cause:** Suno API down, API key expired, or circuit breaker tripped.

**Steps:**
1. Check circuit breaker state:
   ```bash
   curl https://<service-url>/api/suno/circuit-breaker \
     -H "Cookie: <admin-session>"
   ```
2. Check the Suno API status page or test directly with a known API key.
3. Inspect logs for `SunoApiError` with status 429, 401, or 5xx.
4. If the circuit breaker is open, it will auto-reset after the configured timeout. You can also reset manually via the admin panel.

**Fix:** If the platform API key is expired, rotate it via [Secrets Rotation Runbook](./secrets-rotation-runbook.md#sunoapi_key). If user keys are affected, advise users to refresh their key in Settings.

---

### 3. Authentication is broken (users can't log in)

**Cause:** `AUTH_SECRET` changed, session cookie domain mismatch, or Google OAuth credential issue.

**Steps:**
1. Check Sentry for `JWTVerificationFailed` or similar NextAuth errors.
2. Verify `AUTH_SECRET` matches between the running instance and environment variables in Railway.
3. Check `AUTH_URL` matches the deployed URL exactly (including protocol).
4. For Google sign-in issues, check `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` are correct and the OAuth app is not suspended.

**Fix:** If `AUTH_SECRET` was accidentally rotated, restore the previous value. If intentionally rotating, all sessions are invalidated — communicate downtime to users first. See [Secrets Rotation](./secrets-rotation-runbook.md#auth_secret).

---

### 4. Payments / Stripe webhooks failing

**Cause:** `STRIPE_WEBHOOK_SECRET` mismatch, Stripe IP allowlist issue, or endpoint timeout.

**Steps:**
1. In the Stripe Dashboard → Webhooks, check the event delivery log for the production endpoint.
2. Look for 400 errors — usually a signature verification failure (wrong `STRIPE_WEBHOOK_SECRET`).
3. Look for 5xx/timeout errors — the webhook handler is crashing; check Sentry.
4. Verify the endpoint URL in Stripe matches the production URL.

**Fix:** Rotate the webhook secret if needed: [Stripe Secrets Rotation](./secrets-rotation-runbook.md#stripe_secret_key--stripe_webhook_secret).

---

### 5. Email delivery failing

**Cause:** Mailjet API key invalid, rate limit hit, or domain reputation issue.

**Steps:**
1. Check Mailjet dashboard for delivery errors or bounce rates.
2. Inspect logs for `mailjet` errors.
3. If `MAILJET_API_KEY`/`MAILJET_SECRET_KEY` are not set, the app falls back to `console.log` — emails are effectively silently dropped.

**Fix:** Rotate Mailjet keys: [Mailjet Secrets Rotation](./secrets-rotation-runbook.md#mailjet_api_key--mailjet_secret_key).

---

### 6. Scheduled jobs not running (feed generation, embeddings)

**Cause:** `CRON_SECRET` mismatch, Railway cron trigger misconfigured, or job crashing.

**Steps:**
1. Check `/api/health` → `jobs` array for `lastRun.success: false` and any `error` field.
2. Verify `CRON_SECRET` in Railway matches the token used by the cron trigger.
3. Check Railway cron job configuration — is the trigger enabled and pointing to the right endpoint?
4. Check Railway logs around the expected cron run time.

Cron endpoints:
- `/api/cron/feed-auto-generate` — auto-generates feed content
- `/api/cron/generate-embeddings` — refreshes song embeddings for recommendations
- `/api/cron/refresh-smart-playlists` — updates smart playlist membership

**Fix:** Rotate `CRON_SECRET` if mismatched: [Cron Secret Rotation](./secrets-rotation-runbook.md#cron_secret).

---

### 7. High memory / OOM crash

**Cause:** Memory leak, unusually large request body, or excessive concurrent generation requests.

**Steps:**
1. Check Railway metrics for memory usage trend.
2. Inspect logs just before the crash for the last successful request and any warnings.
3. Check `queueDepth` in `/api/health` — a large queue backed up can hold many objects in memory.

**Fix:** Restart the service immediately to restore availability. Then investigate the root cause using Sentry replays and logs from just before the crash. Consider increasing Railway service memory if load has genuinely increased.

---

### 8. Database migration failed on deploy

**Cause:** Migration syntax error, conflicting migration, or the `docker-entrypoint.sh` migration step failed.

**Symptoms:** Container exits with non-zero code immediately after deploy; Railway shows the service as "crashed".

**Steps:**
1. Check Railway deploy logs for the Prisma migration output.
2. Look for `ERROR: relation already exists` or similar Postgres errors.
3. The entrypoint first runs `migrate resolve --rolled-back` for `20260322200000_add_missing_schema_objects` (to clear a known pre-existing drift), then `migrate deploy`.

**Fix:** Follow the [Database Migration Rollback](./deployment-runbook.md#database-migration-rollback) procedure.

---

## Escalation Contacts

| Role | When to escalate |
|------|-----------------|
| On-call engineer | Any P1/P2 incident |
| Database admin | Schema corruption, data loss, migration failures |
| Stripe support | Payment processing unavailable after local fix attempts |
| Railway support | Infrastructure/platform issues (container won't start, persistent OOM) |

---

## Post-Incident Checklist

After a P1 or P2 is resolved:

- [ ] Service is healthy (`/api/health` returns `status: ok`)
- [ ] Sentry error rate is back to baseline
- [ ] Root cause identified
- [ ] Immediate mitigation documented
- [ ] Follow-up issue filed for permanent fix
- [ ] Affected users notified if data or functionality was impacted
- [ ] Runbook updated if a new failure mode was discovered

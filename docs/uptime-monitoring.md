# Uptime Monitoring

External monitor for the SunoFlow production service. Railway's built-in health
check only restarts the container when it fails — it does not alert humans. This
workflow runs off-platform so it can still detect outages when the service,
database, or Railway's edge is degraded.

## How it works

- **Workflow**: `.github/workflows/uptime-monitor.yml`
- **Schedule**: every 5 minutes (`*/5 * * * *`) + `workflow_dispatch` for manual runs
- **Target**: `<PRODUCTION_URL>/api/health` (defaults to `https://sunoflow.up.railway.app`)
- **Check**: HTTP `200`, JSON body with `.status == "ok"` and `.db == true`
- **Retries**: 3 probes, 30 s apart — a single transient blip will not fire an alert
- **Worst-case detection**: up to ~5 minutes until the next scheduled run + ~1 minute of retries, so a real outage surfaces inside the 10-minute SLA

Because the health endpoint runs `SELECT 1` against Postgres before returning
`200`, a failure here catches both HTTP and database-level outages. See
`src/app/api/health/route.ts`.

## Alerting

Two notification paths, both off-platform:

1. **GitHub email (always on)** — when a scheduled workflow run fails on the
   default branch, GitHub emails the account that last touched the workflow file.
   Confirm at **GitHub → Settings → Notifications → Actions** that "Send
   notifications for failed workflows only" is enabled.
2. **Webhook (optional)** — set the repository secret `UPTIME_ALERT_WEBHOOK` to
   a Slack/Discord/Teams incoming webhook URL. On failure the workflow POSTs a
   JSON body `{"text": "...", "username": "uptime-monitor"}` which Slack-style
   incoming webhooks accept as-is. Rotate by overwriting the secret.

## Configuration

| Kind     | Name                    | Required | Purpose                                                       |
|----------|-------------------------|----------|---------------------------------------------------------------|
| Variable | `PRODUCTION_URL`        | no       | Override the default target (e.g. custom domain). No trailing `/`. |
| Secret   | `UPTIME_ALERT_WEBHOOK`  | no       | Slack-compatible incoming webhook URL for failure alerts.     |

Set these at **GitHub → Repository → Settings → Secrets and variables → Actions**.

## Verifying the monitor

Trigger a manual run to confirm the workflow is wired correctly:

```bash
gh workflow run uptime-monitor.yml
gh run list --workflow=uptime-monitor.yml --limit 1
```

To test the failure path without breaking production, dispatch the workflow
against a URL that is guaranteed to 502:

```bash
gh workflow run uptime-monitor.yml -f url=https://sunoflow.up.railway.app/api/health-does-not-exist
```

The run should fail after 3 retries and (if `UPTIME_ALERT_WEBHOOK` is set) post
a webhook message. GitHub will email the workflow-file owner.

## When an alert fires

Follow the [incident response runbook](./incident-response.md#1-app-is-returning-503--health-check-failing).
Quick triage:

```bash
curl https://sunoflow.up.railway.app/api/health
```

- `{"status":"error","db":false}` → Postgres is unreachable from the app
- HTTP 502/503 with no JSON → container down or Railway edge degraded
- HTTP 200 but `generation.queueDepth` climbing → worker stuck, see scheduler

## Known limitations

- GitHub-hosted cron can drift by several minutes under heavy platform load.
  The 5-minute cadence plus built-in retries absorbs typical drift, but during
  a GitHub Actions incident detection may lag.
- Email notifications route to a single GitHub account. For wider reach, set
  `UPTIME_ALERT_WEBHOOK` or add a second path such as a PagerDuty Events API
  integration.
- This check is intentionally dumb: it only knows about `/api/health`. Deeper
  probes (generation queue stuck, Stripe webhook broken, Suno API 429s) belong
  in Sentry alert rules — see [sentry-alerting.md](./sentry-alerting.md).

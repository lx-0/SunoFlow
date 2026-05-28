---
milestone: M003
slice: S03
project: SunoFlow
created: 2026-05-28T09:30:43Z
task_count: 4
completed_tasks: 4
status: done
---

# M003-S03 -- Slice Plan

**Goal:** `/api/mcp` ist produktionsreif gehärtet -- Origin-Header-Validation gegen DNS-Rebinding (MCP Spec MUST), Per-User-Rate-Limiting, Per-Tool-Sentry/GlitchTip-Logging für Auth-Failures + Tool-Errors. Exit Criteria #8 + #9 erfüllt.

## Tasks

- [x] T01 -- Origin-Header-Allowlist: Middleware in `src/app/api/mcp/route.ts` (oder shared helper `src/lib/mcp/origin-guard.ts`) prüft `Origin`-Header gegen Whitelist. Default-Whitelist: `https://claude.ai`, `https://*.anthropic.com`, `https://desktop.anthropic.com`. Configurable via `MCP_ALLOWED_ORIGINS` env (comma-separated). Bei Mismatch: HTTP 403 + GlitchTip-Event mit Origin + IP. Dev-Bypass nur wenn `NODE_ENV=development`.
- [x] T02 -- Rate-Limit per API-Key: Prüfe ob bestehender Helper in `src/lib/rate-limit/` existiert. Falls nicht: in-memory Token-Bucket `src/lib/mcp/rate-limit.ts` keyed by API-key hash (60 req/min default, override via `MCP_RATE_LIMIT_RPM` env). Headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` setzen. Bei Exceed: HTTP 429 + Retry-After header.
- [x] T03 -- Per-Tool-Sentry-Logging: Wrap jeden Tool-Dispatch im HTTP-Transport mit try/catch -> `logServerError({ event: "mcp.tool.error", tool: name, userId, error })`. Auth-Failures (T01-T02) emiten eigene Events (`mcp.auth.rejected`, `mcp.rate_limit.exceeded`). Tag Events mit `release` SHA wie bestehende Sentry-Config.
- [x] T04 -- Verification + Lessons: curl-Tests mit (a) bad Origin → 403 + GlitchTip-Event sichtbar, (b) 70x in 60s → 429, (c) Tool-Error via injected exception → GlitchTip-Event mit tool name. KNOWLEDGE.md ergänzt um "MCP-Server Hardening Recipe" entry. CHANGELOG-Eintrag für die Sicherheits-Härtung.

## Done when

All tasks `[x]`. curl-Probes belegen 403/429/Sentry-Event. Logs in GlitchTip-Project `sunoflow-prod` zeigen die drei Event-Types.

## Notes

- Spec-Reference: modelcontextprotocol.io/docs/concepts/transports → "Servers MUST validate the Origin header on all incoming connections to prevent DNS rebinding attacks".
- Rate-Limit in-memory: bei Multi-Instance-Deploy (Railway Replicas) bricht das. Für M003 OK weil Railway aktuell single-instance ist; Note in KNOWLEDGE.md für später (Redis-backed Replacement bei Scale).
- `logServerError` ist bereits in der Codebase etabliert (`src/lib/error-logger/server.ts`). Re-use, nicht neuer Logger.
- Sentry-Event-Volume: Auth-Failures können bei Probing-Angriffen flooden -- Suppression-Regex für gleichen IP+Origin innerhalb 60s ergänzen (siehe bestehender `src/lib/error-logger`-Pattern für Content-Reject-Suppression).

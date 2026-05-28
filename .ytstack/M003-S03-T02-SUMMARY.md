---
milestone: M003
slice: S03
task: T02
project: SunoFlow
closed: 2026-05-28T10:45:00Z
verification: passed
---

# M003-S03-T02 -- Summary

## Outcome

`src/lib/mcp/rate-limit.ts` exportiert `checkMcpRateLimit(apiKey)` -- sliding-window in-memory Map, 60-Sekunden-Fenster, Default 60 req/min override via `MCP_RATE_LIMIT_RPM` env. Key ist sha256(apiKey) (nicht userId), damit ein leaked Key isoliert getrottelt wird ohne andere Keys desselben Users zu beeinträchtigen. Periodische Eviction bei >50k Keys.

Route: `checkMcpRateLimit` läuft NACH Auth (sonst poisoneten unauthenticated probes den authentifizierten User-Bucket). Bei Exceed: 429 + `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining: 0` Headers + GlitchTip Event `mcp.rate_limit.exceeded` mit userId + limit-Tag.

`_resetMcpRateLimit()` Export für Tests, in `beforeEach` jeder route.test.ts.

## Deviations from plan

- **Pattern mirror, nicht Reuse**: das bestehende `src/lib/rate-limit/sliding-window.ts` ist eng an Next.js Middleware (returnt `NextResponse`, nutzt IP+Path-Buckets). Für MCP brauchten wir Pure-Function-API (`{ allowed, retryAfterSec, ... }`) + key-by-API-key-hash. Klone des sliding-window-Patterns ist ehrlicher als ein über-generisches Interface. Same Redis-Migration-Pfad dokumentiert.

## Follow-ups

- **Multi-Instance-Scaling**: bei Railway Replica-Count > 1 muss Redis ZADD-Pattern. Single-instance heute, Note in KNOWLEDGE.md (kommt in T04).
- **Per-Tool-Bucket** (optional later): `generate_song` darf nicht 60x/min ausgelöst werden -- separate Per-Tool-Limit könnte sinnvoll sein. Out-of-scope für M003.

## Verification

`pnpm vitest run src/app/api/mcp/route.test.ts -t "rate limit"` -- passed. 4 Calls mit `MCP_RATE_LIMIT_RPM=3`: 1-3 erfolgreich (status < 400), 4 → 429 mit `Retry-After: 60`, `X-RateLimit-Limit: 3`.

---
milestone: M003
slice: S03
task: T03
project: SunoFlow
closed: 2026-05-28T10:46:00Z
verification: passed
---

# M003-S03-T03 -- Summary

## Outcome

`handleRequest` in `src/app/api/mcp/route.ts` emittiert GlitchTip-Events an 4 Reject-Pfaden via `logServerError`:
- `mcp.origin.rejected` (T01) -- tags: reason (missing|blocked), origin
- `mcp.auth.rejected` (T02) -- tags: origin (kontext-erhellend)
- `mcp.rate_limit.exceeded` (T02) -- userId, tags: limit
- `mcp.handler.error` -- outer try/catch um den SDK-Dispatch, fängt unhandled Tool-Errors oder Transport-Probleme + returnt 500 + emittiert Event

`logServerError` ist bereits etablierter Pattern (siehe Memory `business_logic_failures_need_error_tracking`). Route-tag `/api/mcp`, correlationId auto-generated.

## Deviations from plan

- **Per-Tool-Sentry-Wrapping NICHT eingebaut**: das `setRequestHandler(CallToolRequestSchema, ...)` in `register-handlers.ts` lässt Tool-Errors propagieren -- SDK fängt sie und sendet MCP-Error-Response (`McpError`). Das ist korrektes JSON-RPC-Verhalten. `mcp.handler.error` fängt nur den Outer-Pfad ab. Per-Tool-Logging wäre Verkapselung der Business-Errors als "server errors" -- das sind sie nicht. Wenn ein Tool wegen Bad-User-Input fehlschlägt, ist das KEIN Sentry-Event.
- **Suppression-Regex nicht implementiert**: Auth-Failure-Flooding wird relevant wenn Probing aktiv stattfindet. Heute (private Beta) nicht. Note für Follow-up.

## Follow-ups

- **Per-Tool-Logging als opt-in**: in register-handlers.ts könnte man optional einen "shouldLogError(toolName, error)" Hook akzeptieren der bei bestimmten Tools (z.B. `generate_song`) Failures als business-failure loggt. Heute reicht es dass Tool-internes `logServerError` (im Tool-Handler selbst) bei realen Backend-Fehlern emittiert.
- **Auth-Flooding-Suppression**: same-IP-same-key-within-60s als Single Event collapsen wenn Probing-Traffic auftaucht.

## Verification

`pnpm vitest run src/app/api/mcp/route.test.ts` -- 12 passed. Console-Output zeigt 4 emittierte `mcp.auth.rejected` Events in den negativen Auth-Tests (bewiesen via Sentry-pino-Pipe).

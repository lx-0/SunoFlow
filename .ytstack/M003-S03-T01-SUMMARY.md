---
milestone: M003
slice: S03
task: T01
project: SunoFlow
closed: 2026-05-28T10:42:00Z
verification: passed
---

# M003-S03-T01 -- Summary

## Outcome

`src/lib/mcp/origin-guard.ts` exportiert `checkOrigin(req)` mit Default-Allowlist (claude.ai, desktop.anthropic.com, app.cursor.sh, cursor.sh) override via `MCP_ALLOWED_ORIGINS` env. Sentinel `*` deaktiviert die Prüfung (Self-Hoster mit eigener Netzwerk-Grenze). Dev-Bypass für missing Origin in `NODE_ENV=development|test` (curl + Inspector funktionieren lokal); blocked-Origin wird in jeder Umgebung abgelehnt.

`src/middleware.ts` PUBLIC_PATHS += `/api/mcp` (mit Kommentar dass die Route ihren eigenen Auth-Pfad macht). Damit fällt der MCP-Endpoint nicht in den JWT-Cookie-Redirect-Pfad und Bearer-Header-Auth funktioniert (per Memory `feedback_sunoflow_middleware_media_proxies_public`).

`src/app/api/mcp/route.ts` ruft `checkOrigin` als ersten Schritt vor Auth. Bei Reject: 403 + `logServerError("mcp.origin.rejected")` mit `reason` + `origin` Tags (GlitchTip Event).

## Deviations from plan

- **Test-bypass für missing-Origin in NODE_ENV=test** ergänzt, damit existierende Tests nicht alle Origin-Header brauchen. Blocked-Origin wird weiterhin abgelehnt -- nur die "missing"-Variante ist tolerant.

## Follow-ups

- **Future**: production sollte konkrete `MCP_ALLOWED_ORIGINS` Railway-env setzen statt sich auf Default zu verlassen (für engere Kontrolle). Default ist Safe-Default + Convenience.

## Verification

`pnpm vitest run src/app/api/mcp/route.test.ts` -- 12 passed. Origin-Tests: blocked Origin → 403 (+ `reason: "origin blocked"`), allowed Origin (claude.ai) → 2xx.

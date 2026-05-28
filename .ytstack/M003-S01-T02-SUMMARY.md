---
milestone: M003
slice: S01
task: T02
project: SunoFlow
closed: 2026-05-28T10:05:00Z
verification: passed
---

# M003-S01-T02 -- Summary

## Outcome

`src/app/api/mcp/route.ts` exportiert POST + GET Next.js App-Router-Handler. Beide rufen `handleRequest(req)`: prüft `Authorization: Bearer sk-...` Header via `resolveApiKeyFromHeader`, returnt 401 + `WWW-Authenticate: Bearer realm="sunoflow"` falls Auth fehlt/falsch, baut sonst per Request einen frischen `Server` mit nur `sunoflow_info` Tool registriert und delegiert an `createMcpHttpHandler` aus T01. `runtime = "nodejs"` + `dynamic = "force-dynamic"` damit Prisma + Per-Request-State funktionieren.

`mcp/auth.ts` refactored: gemeinsamer `resolveApiKey(rawKey)` Helper wird von beiden Pfaden gerufen -- `resolveApiKeyFromEnv` (stdio, unverändert in der Signatur) und neu `resolveApiKeyFromHeader(authHeader)` (HTTP). Parsed `Bearer\s+<key>` case-insensitive, lehnt nicht-Bearer-Schemas + nicht-`sk-`-Keys früh ab.

`src/app/api/mcp/route.test.ts` (7 Tests): Missing Header → 401, Non-Bearer-Scheme → 401, nicht-`sk-` Key → 401 ohne DB-Lookup, unknown Key → 401 mit DB-Lookup, valid Key → 200 + initialize-Response, tools/list zeigt `sunoflow_info`, tools/call returnt server version + userId. Prisma + env mocked auf Module-Level analog `mcp/server.test.ts`.

## Deviations from plan

- **Import-Pfad-Adjustment**: `@/mcp/auth` resolved nicht weil `@/*` nur auf `./src/*` zeigt und `mcp/` am Repo-Root liegt. Behoben mit relativem Import `../../../../mcp/auth` + Inline-Kommentar dass S02-T01 die Datei nach `src/lib/mcp/` migriert -- dann wird der Import sauber `@/lib/mcp/auth`.
- Plan listete `vitest.config.ts`-Modify als Konditional; nicht nötig, Default-Globs decken `src/app/api/**/*.test.ts` ab.

## Follow-ups

- **S02-T01**: `mcp/auth.ts` → `src/lib/mcp/auth.ts` verschieben damit der relative Import wegkann. Existierender stdio-Pfad `mcp/server.ts` muss dann `from "@/lib/mcp/auth"` schreiben.
- **S03**: `WWW-Authenticate` Header wird in S05 für OAuth-Discovery erweitert (RFC-9728 `resource_metadata=...` Parameter).
- **KNOWLEDGE.md** (sammelt in S01-T04): "Next.js App-Router-Path-Aliases gelten nur unter `./src/*` -- Code unter Repo-Root braucht relative Imports oder Codewanderung".

## Verification

Command: `pnpm vitest run src/app/api/mcp/route.test.ts src/lib/mcp/http-transport.test.ts mcp/server.test.ts && pnpm tsc --noEmit` -- passed.

- 3 test files, 19 tests passed (route 7, transport 2, server 10) -- regression-clean
- `pnpm tsc --noEmit` → 0 errors

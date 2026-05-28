---
milestone: M003
slice: S02
task: T01
project: SunoFlow
closed: 2026-05-28T10:21:00Z
verification: passed
---

# M003-S02-T01 -- Summary

## Outcome

Bereits in S01-T02 erledigt. `mcp/auth.ts` exportiert: `resolveApiKey(rawKey)` (private shared helper), `resolveApiKeyFromEnv()` (stdio), `resolveApiKeyFromHeader(authHeader)` (HTTP). Beide Pfade gehen durch die gleiche `prisma.apiKey.findFirst` + sha256-Hash + fire-and-forget `lastUsedAt`-Update Logik.

## Deviations from plan

- **Work vorgezogen:** ohne Header-Auth war S01-T02's Route-Handler nicht funktionsfähig, also musste die Auth-Split in S01-T02 mit erledigt werden. T01 ist hier nur formeller Close.

## Follow-ups

- None.

## Verification

Command: `pnpm vitest run mcp/server.test.ts src/app/api/mcp/route.test.ts` -- passed (17/17 tests green, beide Auth-Pfade bewiesen).

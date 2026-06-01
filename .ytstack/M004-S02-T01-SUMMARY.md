---
milestone: M004
slice: S02
task: T01
project: SunoFlow
closed: 2026-06-01T17:28:00Z
verification: passed
---

# M004-S02-T01 -- Summary

## Outcome

`POST /api/v1/auth/token` (`src/app/api/v1/auth/token/route.ts`): native-client login.
Validates `{ email, password, deviceName? }`, verifies the user (exists, has a password
hash, not disabled, password matches via the existing `verifyPassword`), and on success
mints a **revocable API key (`sk-...`)** via the existing `generateApiKey` + `ApiKey`
model, returning the raw key once. The mobile app stores it in the keychain and sends it
as `Authorization: Bearer sk-...`.

## Design pivot (vs. the original plan)

The plan assumed a new JWT + refresh-token system. While grounding in the code I found
`resolveUser()` (`src/lib/auth/index.ts`) **already** authenticates `Authorization: Bearer
sk-...` API keys (the same path the MCP server uses). So:
- **T02 (bearer middleware) was already done** — no new verification code.
- T01 reuses the existing key crypto instead of inventing a parallel JWT mechanism.
- No refresh machinery: API keys are long-lived + revocable (sign-out = revoke).

This is smaller, lower-risk, and reuses tested code. Recorded as a DECISIONS-worthy pivot.

## Security choices

- **Generic 401** in every failure branch (unknown user / disabled / no password / wrong
  password) — no user-enumeration.
- The credential minted is a **revocable key**, not a session/password.
- **Open follow-up (flagged in code + T05/T03):** brute-force rate-limiting is NOT yet
  applied to this endpoint. Bounded for closed beta; must land before public launch
  (per-IP + per-email via the existing `@/lib/rate-limit`).

## Verification (passed)

- `vitest run src/app/api/v1/auth/token/route.test.ts` → **5 passed** (valid → 201 + `key`,
  wrong-pw → 401 + no mint, unknown → 401, disabled → 401 without password check,
  malformed → 400). Runs the REAL `publicRoute` wrapper (only env/auth/prisma mocked).
- `tsc --noEmit` → clean (run via `./node_modules/.bin/tsc`; `pnpm exec` separately tripped
  a deps-status purge unrelated to the code).

## Follow-ups

- Mobile `apps/mobile/src/auth/session.ts` was scaffolded for an access+refresh JWT pair;
  reconcile it to store the single API key (`setKey`/`getKey`/`clearKey`) — that slice is
  still UNTESTED (no device).
- T03 revoke endpoint/alias; T04 Google native sign-in (deferred); rate-limiting.

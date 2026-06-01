---
milestone: M004
slice: S02
project: SunoFlow
created: 2026-06-01T15:02:29Z
status: in-progress
task_count: 5
completed_tasks: 2
---

# M004-S02 -- Slice Plan

**Goal:** The SunoFlow backend issues + verifies bearer tokens for the native client, additively, without changing the existing cookie-based web auth.

## Tasks

- [x] T01 -- `POST /api/v1/auth/token`: exchange credentials for a credential the app can store. **DESIGN PIVOT:** mints a revocable **API key (`sk-...`)** (not a JWT) — reuses the existing `generateApiKey` + `ApiKey` model, and the existing `resolveUser()` Bearer path authenticates it. Generic 401 in all failure branches (no user-enumeration); honors `isDisabled` + password-less accounts. 5 vitest cases green, tsc clean. (Login ≠ registration, so no invite-gate/PLAYWRIGHT bypass needed.)
- [x] T02 -- Bearer middleware: **already existed.** `resolveUser()` (`src/lib/auth/index.ts`) checks session OR `Authorization: Bearer sk-...` → no new middleware needed. Admin OR-merge already holds in `session.ts` (jwt callback) + `requireAdmin()`. Verified by reading, not re-implemented.
- [ ] T03 -- Revoke on sign-out: the minted key is revocable via the existing `DELETE /api/profile/api-keys/:id` (authenticates with the same Bearer key). Optional: a `/api/v1/auth/revoke` alias. No refresh-token machinery — API keys are long-lived by design.
- [ ] T04 -- Google native sign-in: `expo-auth-session` PKCE flow -> token exchange against the new endpoint. If it balloons, land email/password only and document Google as deferred (do not fake it).
- [~] T05 -- Tests: T01 endpoint has 5 vitest cases (valid → 201 + key, wrong-pw → 401, unknown → 401, disabled → 401, malformed → 400) running the REAL `publicRoute` wrapper (only env/auth/prisma mocked, so the wiring path is exercised). tsc clean. Remaining: a test for the revoke path (T03) when built.

## Done when

All tasks `[x]` and verified. A bearer token minted by `/api/v1/auth/token` authenticates a protected API route in an automated test; cookie-based web auth is unchanged; typecheck + tests green.

## Notes

- This is the biggest correctness seam: web (cookie) and native (bearer) must stay consistent. Watch the JWT `lastLoginAt` / active-user union seam (`src/lib/active-users`).
- Media-proxy endpoints stay public (track-player streams without auth headers) -- decide separately whether to sign URLs (tracked in CONTEXT open questions).

---
milestone: M004
slice: S02
project: SunoFlow
created: 2026-06-01T15:02:29Z
status: planned
task_count: 5
completed_tasks: 0
---

# M004-S02 -- Slice Plan

**Goal:** The SunoFlow backend issues + verifies bearer tokens for the native client, additively, without changing the existing cookie-based web auth.

## Tasks

- [ ] T01 -- `POST /api/v1/auth/token`: exchange credentials (existing credentials provider) for an access JWT + refresh token. Honor the invite-only gate and the `PLAYWRIGHT_TEST` bypass contract for the new surface.
- [ ] T02 -- Bearer middleware: accept `Authorization: Bearer <jwt>` on API routes alongside the NextAuth cookie path; a `verifyBearer()` helper resolves the user. Admin OR-merge must hold in BOTH `session.ts` and `requireAdmin()`.
- [ ] T03 -- `POST /api/v1/auth/refresh` + revoke: refresh-token rotation, lifetimes (1h access / 30d refresh), revocation path on sign-out.
- [ ] T04 -- Google native sign-in: `expo-auth-session` PKCE flow -> token exchange against the new endpoint. If it balloons, land email/password only and document Google as deferred (do not fake it).
- [ ] T05 -- Tests: route + middleware unit tests PLUS at least one UNMOCKED critical-path test per route with fake deps (per the mocks-mask-wiring-bugs rule). `pnpm tsc --noEmit` clean (BigInt-in-mocks trap).

## Done when

All tasks `[x]` and verified. A bearer token minted by `/api/v1/auth/token` authenticates a protected API route in an automated test; cookie-based web auth is unchanged; typecheck + tests green.

## Notes

- This is the biggest correctness seam: web (cookie) and native (bearer) must stay consistent. Watch the JWT `lastLoginAt` / active-user union seam (`src/lib/active-users`).
- Media-proxy endpoints stay public (track-player streams without auth headers) -- decide separately whether to sign URLs (tracked in CONTEXT open questions).

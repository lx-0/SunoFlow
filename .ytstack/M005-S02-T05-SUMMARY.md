---
milestone: M005
slice: S02
task: T05
project: SunoFlow
closed: 2026-07-22T16:50:00Z
verification: passed
---

# M005-S02-T05 -- Summary

## Commits

- `M005-S02-T05: test(jam): committed host-flow e2e + test-only tier grant` (single commit for this task; closes slice S02)

## Outcome

`e2e/jam-session.spec.ts` (skips on remote targets): a studio host runs the
full flow — Jam button on /playlists, budget form, /party console with
countdown + join URL, public tokened state GET via the cookie-less request
fixture, QR overlay open/Esc-close, End-session inline confirm, and the
closed-session 409 guardrail for guest pushes; zero pageerrors asserted.
Second test: free-tier users see no Jam entry point. The spec deliberately
NEVER pushes a prompt against an OPEN session — local servers usually carry
a real SUNOAPI_KEY and a committed spec must not burn generation credits.

New test-infra: `POST /api/test/grant-tier` (PLAYWRIGHT_TEST-gated 404
otherwise) upserts a subscription tier for a test user — tier-gated UI was
previously untestable. Middleware PUBLIC_PATHS now allows the `/api/test/`
prefix (each route self-gates), replacing the single test/login entry.

## Deviations from plan

- The plan's "mocked completion lands the song in playlist + queue" leg was
  descoped from the COMMITTED spec (any open-session push risks real credits
  locally); that path is covered by 33 unit tests + this session's recorded
  keyless/keyed runtime smokes. The full two-context guest flow lands in
  S03-T05 with an explicitly keyless webServer env.
- Initial spec version used a raw fetch in beforeAll — failed via the
  middleware redirect-to-/login whose Location header drops the port on
  plain `next start` (the known standalone port-leak); rewritten onto the
  baseURL-configured request fixture and fixed properly by the PUBLIC_PATHS
  prefix.

## Follow-ups

- S03-T05: run the full guest-push e2e against a keyless server env.

## Verification

Command: `npx playwright test e2e/jam-session.spec.ts` (2 passed) + regression run of account-menu/player-options/lyrics-panel specs (6 passed) + `npx vitest run` (1991 passed) + `npx tsc --noEmit` + `pnpm build` -- passed.

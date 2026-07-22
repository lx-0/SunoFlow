---
milestone: M005
slice: S01
task: T04
project: SunoFlow
closed: 2026-07-22T13:40:00Z
verification: passed
---

# M005-S01-T04 -- Summary

## Commits

- `M005-S01-T04: feat(jam): guest prompt push through the generation pipeline` (single commit for this task)

## Outcome

`POST /api/jam/[token]/prompts` (publicRoute + zod body) →
`pushJamPrompt`: open-session check, sanitized prompt (1..500, the Suno
non-custom cap), per-guest open-prompt cap (2 pending per guestKey),
**atomic budget reservation** via conditional `updateMany` increment BEFORE
the Suno call (two guests racing the last slot cannot overshoot; failures
run a compensating decrement). Generation mirrors the canonical MCP path on
behalf of the HOST: `resolveUserApiKeyWithMode` → internal credits
check/deduct for non-personal-key hosts → `generateSong` → Song (pending,
owner = host) + JamSessionEntry in one transaction. Keyless demo mode
creates an instant mock "ready" song (keeps keyless E2E working). Suno
rejections map to 502 SUNO_API_ERROR with a guest-friendly message and a
logger.warn; unexpected errors logServerError + 500.

## Deviations from plan

- Route uses `publicRoute` (supports zod bodies), not `anonRoute` — anonRoute's
  schema type is `RouteSchemas<never>` (no body support). The IP backstop was
  dropped in favor of the DB guardrails; an unknown token costs one indexed
  lookup.
- `/api/jam/` added to middleware PUBLIC_PATHS — **T03 errata**: without it
  every guest request redirected to /login (the media-proxy trap from
  KNOWLEDGE). T03's route tests could not catch this (they bypass middleware);
  S02/S03 E2E will exercise the real path.

## Follow-ups

- S03's guest page must generate + persist `guestKey` (localStorage) with
  8..64 chars to satisfy the body schema.
- E2E must cover the middleware pass-through (guest fetch without session
  cookie hits the route, not /login) — S02-T05/S03-T05.

## Verification

Command: `npx vitest run src/lib/jam/` + `npx tsc --noEmit` -- passed (28 jam tests; full suite 1983 passed / 47 skipped; tsc clean).

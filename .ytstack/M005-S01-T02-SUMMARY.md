---
milestone: M005
slice: S01
task: T02
project: SunoFlow
closed: 2026-07-22T12:55:00Z
verification: passed
---

# M005-S01-T02 -- Summary

## Commits

- `M005-S01-T02: feat(jam): host routes — create/close session + entry veto` (single commit for this task)

## Outcome

`src/lib/jam/sessions.ts` now owns the host-side session lifecycle:
`createJamSession` resolves the tier from `prisma.subscription`
(`normalizeTier` + `canUseFeature("jamSessions")`, new studio-gated entry in
FEATURE_GATES), validates budget 1..100 (default 30), caps open sessions at 3
per host, and creates playlist + JamSession in one transaction.
`closeJamSession` is ownership-checked and idempotent. `vetoJamEntry` flips
only `pending` entries to `vetoed` (409 otherwise) — running generations are
not cancelled, budget stays consumed (per pitch). Thin authRoute wrappers:
`POST /api/jam-sessions` (201), `POST /api/jam-sessions/[id]/close`,
`DELETE /api/jam-sessions/[id]/entries/[entryId]`.

## Deviations from plan

None.

## Follow-ups

- The session playlist is a plain playlist and appears in the host's playlist
  list; consider a marker/filter if that gets noisy (defer to S02 UI work).

## Verification

Command: `npx vitest run src/lib/jam/ src/app/api/jam-sessions/` + `npx tsc --noEmit` -- passed (17 new tests; full suite 1969 passed / 47 skipped; tsc clean).

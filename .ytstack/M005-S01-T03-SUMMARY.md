---
milestone: M005
slice: S01
task: T03
project: SunoFlow
closed: 2026-07-22T13:10:00Z
verification: passed
---

# M005-S01-T03 -- Summary

## Commits

- `M005-S01-T03: feat(jam): tokened guest state endpoint` (single commit for this task)

## Outcome

`GET /api/jam/[token]` (anonRoute) serves the guest surface:
`getJamSessionState(shareToken)` returns session meta (name, hostName,
status, budget countdown), all non-vetoed entries in request order (vetoed
cards disappear, failed ones stay as honest feedback) with LEAN song cards
(id/title/imageUrl/duration/generationStatus — a test pins the exact key set
so internals can't leak through the token surface later), and best-effort
`nowPlaying` from the host's PlaybackState, reported only when that song is a
member of the session playlist. IP rate limit is deliberately generous
(600/min) because an entire party polls from one NAT'd Wi-Fi IP.

## Deviations from plan

None.

## Follow-ups

- nowPlaying freshness depends on how often the host client persists
  PlaybackState — S02's host page should confirm the update cadence is good
  enough for a party screen or push its own heartbeat.

## Verification

Command: `npx vitest run src/lib/jam/` + `npx tsc --noEmit` -- passed (19 jam tests green; one test-only type error fixed during the run — no `as` cast, null-guard instead).

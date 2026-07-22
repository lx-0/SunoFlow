---
milestone: M005
slice: S03
task: T06
project: SunoFlow
closed: 2026-07-22T17:55:00Z
verification: passed
---

# M005-S03-T06 -- Summary

## Commits

- `M005-S03-T06: feat(jam): custom share slug + session lifetime` (single commit for this task)

## Outcome

Hosts can now pick a human link name — the slug (lowercased,
`[a-z0-9-]{4,40}`) is stored AS the shareToken, so the party link reads
`/jam/alex-party`; collisions 409 with a friendly message. Sessions get a
lifetime (4/12/24/48h in the form, API 1..72h, default 24h) stored as
`expiresAt`; expiry is enforced derived with no cron: state reads report
expired sessions as closed (guests see "party ended"), and the prompt push
rejects them both up front and INSIDE the atomic budget gate so the
deadline cannot be raced. Trade-off recorded in M005-CONTEXT: human slugs
are guessable — bounded by budget cap, per-guest limits, veto, lifetime.

Runtime-verified: custom-slug create (201, token == slug, expiresAt set),
collision 409, expired session → guest page flips to ended within one poll
and a push 409s.

## Deviations from plan

None.

## Follow-ups

- Old sessions keep occupying their slugs forever (global unique). Fine at
  current scale; revisit if slug squatting ever bites.

## Verification

Command: `npx vitest run src/lib/jam/` (49 green) + `npx tsc --noEmit` + `pnpm build` + runtime smoke -- passed.

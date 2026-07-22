---
milestone: M005
slice: S03
task: T04
project: SunoFlow
closed: 2026-07-22T18:55:00Z
verification: passed
---

# M005-S03-T04 -- Summary (DESCOPED)

## Outcome

Descoped per the slice-plan's built-in decision gate ("descope if the auth
coupling turns out too deep"). `SongReaction` has a REQUIRED `userId` FK —
guests have no user row, so guest reactions need either a schema change
(nullable userId + guestKey column) or a parallel guest-reaction table.
Neither is v1-worthy for the party wedge: reactions were "deferred v2+"
adjacent in the pitch anyway, and the guest page's core loop (see queue,
push prompts, watch them land) is complete without them.

No code shipped for this task. The M005-CONTEXT open question on guest
identity is answered by T03's nickname.

## Deviations from plan

Full descope (planned option).

## Follow-ups

- v2 candidate: guest reactions via a `guestKey`-keyed reaction table,
  surfaced on the host's party screen.

## Verification

Command: n/a (descope decision) -- recorded here and in the slice plan.

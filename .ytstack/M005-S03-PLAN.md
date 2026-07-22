---
milestone: M005
slice: S03
project: SunoFlow
created: 2026-07-22T12:05:00Z
status: planned
task_count: 6
completed_tasks: 4
---

# M005-S03 -- Slice Plan

**Goal:** A guest with only the QR link can follow the party and push a prompt from their phone: a tokened mobile-web session page with now-playing, queue and pending cards, a prompt composer with visible rate-limit/budget feedback, and a nickname on their requests.

## Tasks

- [x] T01 -- Guest session page (`/jam/[token]`, public tokened route): now-playing + queue with pending prompt cards and guest names + budget countdown; mobile-first; polling.
- [x] T02 -- Prompt composer: free text + vibe chips, optimistic pending card, visible error states for rate limit / budget exhausted / session closed (no silent branches).
- [x] T03 -- Guest nickname: one-time capture (localStorage), attached to prompts and shown on cards.
- [ ] T04 -- Guest emoji reactions on now-playing (reuse the reactions surface with guest identity; descope to display-only if the auth coupling turns out too deep — decide in plan-task).
- [x] T06 -- Custom share slug + session lifetime (operator request 2026-07-22): host may pick a human link name (/jam/<slug>, [a-z0-9-]{4,40}, collision -> 409) and a duration (default 24h); expired sessions behave exactly like closed ones everywhere (state payload, prompt push incl. the atomic budget gate).
- [ ] T05 -- Full-path E2E: host context creates a session, a second (guest) browser context joins via token URL, pushes a prompt, the card is visible in both contexts, mocked completion makes the song playable in the session playlist.

## Done when

All tasks marked `[x]` and verified via `ytstack:summarize-task`.

## Notes

(Add observations during slice execution. Issues that surface become entries in `DECISIONS.md` or `KNOWLEDGE.md`.)

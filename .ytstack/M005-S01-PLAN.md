---
milestone: M005
slice: S01
project: SunoFlow
created: 2026-07-22T12:05:00Z
status: planned
task_count: 5
completed_tasks: 1
---

# M005-S01 -- Slice Plan

**Goal:** The jam-session backend works end-to-end over HTTP: a STUDIO host creates a session, a tokened guest reads its live state and pushes a prompt that becomes a pending generation with session linkage, and budget / rate-limit / veto guardrails are enforced — all verified by route + unit tests with the Suno client mocked.

## Tasks

- [x] T01 -- Prisma schema + migration: `JamSession` model (host, linked playlist, share token, budget total/used, status open/closed) plus a session-entry linkage that ties generated songs to the session with prompt text + guest display name; migration applies cleanly on a throwaway DB.
- [ ] T02 -- Host routes: create session (STUDIO-gated, creates/links the session playlist, sets budget), close session, delete/veto a pending entry; authRoute + ownership checks; route tests.
- [ ] T03 -- Guest state endpoint: share-token-authenticated GET returning now-playing, queue incl. pending prompt cards, and budget countdown; public route with token validation + IP rate limit; route tests.
- [ ] T04 -- Guest prompt push: token POST that enforces per-guest rate limit + session budget, then starts a generation through the existing pipeline with session linkage; the pending song appears in the session state within one poll; tests with Suno mocked.
- [ ] T05 -- Completion hook: on generation completion the song joins the session playlist and is flagged for host-queue append (extend the `src/lib/songs/lifecycle.ts` seam — direct prisma updates are a smell); unit tests on the seam.

## Done when

All tasks marked `[x]` and verified via `ytstack:summarize-task`.

## Notes

(Add observations during slice execution. Issues that surface become entries in `DECISIONS.md` or `KNOWLEDGE.md`.)

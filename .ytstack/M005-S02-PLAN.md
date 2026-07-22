---
milestone: M005
slice: S02
project: SunoFlow
created: 2026-07-22T12:05:00Z
status: planned
task_count: 5
completed_tasks: 1
---

# M005-S02 -- Slice Plan

**Goal:** A STUDIO host can run a party from the web app: open a session with a budget, put the QR on screen, watch guest prompts arrive as pending cards, veto entries, and have completed songs auto-append to the running play queue.

## Tasks

- [x] T01 -- Session entry point + host page: "Start jam session" action (STUDIO-gated) with budget picker; host session view with live queue (pending cards + completed songs, polling).
- [ ] T02 -- QR overlay + share URL: client-side QR rendering, big-screen-friendly presentation mode.
- [ ] T03 -- Auto-append to the host's play queue on completion (QueueContext integration driven by the session poll; session playlist as `playlistSource`).
- [ ] T04 -- Host controls on the live view: veto/remove pending cards, budget countdown, close session.
- [ ] T05 -- E2E spec: host creates a session, an API-simulated guest prompt appears as a pending card, mocked completion lands the song in playlist + queue; zero pageerrors.

## Done when

All tasks marked `[x]` and verified via `ytstack:summarize-task`.

## Notes

(Add observations during slice execution. Issues that surface become entries in `DECISIONS.md` or `KNOWLEDGE.md`.)

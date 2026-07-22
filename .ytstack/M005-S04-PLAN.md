---
milestone: M005
slice: S04
project: SunoFlow
created: 2026-07-22T21:00:00Z
status: done
task_count: 3
completed_tasks: 3
---

# M005-S04 -- Slice Plan

**Goal:** A STUDIO host can run a jam session entirely from the native app: list/create sessions, show the join QR (+ native share sheet), watch the live queue, veto requests, and end the session.

## Tasks

- [x] T01 -- Mobile jam API client (`apps/mobile/src/api/jam.ts`: bearer-authed list/create/detail/close/veto + tokened state fetch + join-URL helper) and the `react-native-qrcode-svg` dependency (pure JS on top of the installed react-native-svg — no native rebuild).
- [x] T02 -- Screens in the shared route group: `jam.tsx` (session list + create form: name, link-name, budget, duration) and `jam-session/[id].tsx` (host console: 5s poll, budget countdown, join URL + QR + native share sheet, entries list with veto on pending, close with confirm).
- [x] T03 -- Sidebar "Jam Session" entry (Create section, PartyPopper icon) via the fixed goToSection; non-studio users get the server's 403 message surfaced.

## Done when

All tasks marked `[x]` and verified via `ytstack:summarize-task`. Runtime verification happens on the user's next device pass (fresh pnpm release — the installed Release build has an embedded bundle).

## Notes

(Add observations during slice execution.)

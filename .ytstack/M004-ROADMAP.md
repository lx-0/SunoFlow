---
milestone: M004
project: SunoFlow
size: L
created: 2026-06-01T15:02:29Z
status: planned
total_slices: 5
completed_slices: 3
---

# M004 Roadmap

**Goal:** SunoFlow runs as a native iOS app (RN + Expo) whose audio keeps playing through a locked screen, with library, player, and playlists usable natively.

**Exit criteria:**
- EAS build installs on a real device via TestFlight.
- Audio survives screen lock / backgrounding / 10+ min lock; lock-screen + Control Center controls work.
- Signed-in user (bearer auth) can browse + search library, play tracks, view + play playlists, in native UI.
- Tracks stream from existing SunoFlow media endpoints.

## Slices

Slice detail lives in per-slice `M004-S##-PLAN.md` files, created by `ytstack:slice-milestone`.

- [x] S01 -- Foundations: Expo app scaffold, EAS Build CI, `packages/core` extraction (shared TS: zod schemas, API client, domain types), secure-store session shell. (Monorepo restructure step that touches prod deploy = GATED.)
- [x] S02 -- Backend auth path: `/api/v1/auth/token` exchange + refresh, `Authorization: Bearer` accepted on API routes alongside NextAuth cookie. Honors invite-gate + PLAYWRIGHT_TEST bypass + admin OR-merge. (Additive, non-breaking SunoFlow change.)
- [x] S03 -- Core playback (THE fix): `react-native-track-player` integration, AVAudioSession `playback` + `audio` background mode, playback service mapping remote commands, lock-screen / Control Center now-playing, library list + player screen, streaming from existing media endpoints. On-device lock verification.
- [ ] S04 -- Library + Playlists UI: search, playlist view + reorder, favorites/reactions, native waveform (peaks from `src/lib/audio/peaks.ts` or RN lib), settings/sign-out.
- [ ] S05 -- TestFlight beta: EAS Build + EAS Submit, App Store Connect app record, TestFlight to the closed circle, smoke pass on a real device.

## Deferred (not in M004)

- CarPlay scene + browse tree + entitlement request (bonus; own milestone once entitlement lands).
- Generate / Edit flows on mobile (fast-follow milestone).
- Android + Android Auto (Phase 2 milestone).

## Run order

Slices execute sequentially. S01→S02 unblock S03 (the fix). S03→S04 build the UI. S05 ships. After each slice, `ytstack:reassess-roadmap` checks fit.

## How to update this file

- Flip slice checkbox `[ ]` → `[x]` when its tasks are all `summarize-task`-confirmed.
- Update `completed_slices` count.
- On milestone completion, flip `status: planned` → `status: done` and update global ROADMAP.md.

---
milestone: M004
slice: S04
project: SunoFlow
created: 2026-06-01T15:02:29Z
status: planned
task_count: 6
completed_tasks: 0
---

# M004-S04 -- Slice Plan

**Goal:** The Browse + organize surface is usable natively: search, playlists (view + reorder + play), favorites, waveform, and settings.

## Tasks

- [ ] T01 -- Library search + filter: query the existing search endpoint via `packages/core`, debounced input, results list reusing the S03 list/player wiring.
- [ ] T02 -- Playlists: list screen + detail screen (tracks), play a playlist into the track-player queue.
- [ ] T03 -- Playlist reorder: drag-to-reorder in the detail screen -> existing reorder endpoint (the `persistReorder` seam). Optimistic update + rollback on failure.
- [ ] T04 -- Favorites / reactions: toggle favorite + reaction on a track, reflected in library + player; reuse existing endpoints.
- [ ] T05 -- Native waveform: render precomputed peaks from `src/lib/audio/peaks.ts` (ported into `packages/core`) on an RN canvas/SVG, or an RN waveform lib; honor `prefers-reduced-motion`.
- [ ] T06 -- Settings + sign-out: settings screen, sign-out clears `expo-secure-store` tokens and calls the revoke endpoint (S02 T03).

## Done when

All tasks `[x]` and verified. A user can search the library, open + reorder + play a playlist, favorite a track, see a waveform, and sign out -- all native.

## Notes

- Match the product's "tool, not feed" discipline (PRODUCT.md): dense, keyboard/gesture-driven, no recommendation rails. Honor 44px touch targets + contrast baselines.
- Waveform is the one genuinely-new rendering piece; keep it cheap (peaks, not live FFT).

---
milestone: M004
slice: S03
project: SunoFlow
created: 2026-06-01T15:02:29Z
status: planned
task_count: 7
completed_tasks: 0
---

# M004-S03 -- Slice Plan

**Goal:** Native background audio that survives a locked screen -- the root-cause fix -- playing the user's library from a working player + library screen.

## Tasks

- [ ] T01 -- Install + configure `react-native-track-player`: AVAudioSession `playback` category, `audio` background mode via an Expo config plugin, Info.plist entries. App still builds in the simulator.
- [ ] T02 -- Playback service: register the track-player service mapping remote-command events (play / pause / next / previous / seek) to the player; capability set for lock screen + Control Center.
- [ ] T03 -- Now-playing metadata: map the song model (title, artist/persona, cover art, duration) into `MPNowPlayingInfoCenter` so lock screen + Control Center render correctly.
- [ ] T04 -- Library list screen (native): fetch the library via `packages/core` (bearer auth), virtualized list, tap loads the track into the player queue.
- [ ] T05 -- Player screen: transport controls, progress + seek, queue derived from the current library view, play/pause state via track-player hooks.
- [ ] T06 -- Streaming wiring: resolve stream URLs (effective Suno task-id = `parent.sunoJobId ?? self.sunoJobId`; match clip by `id === sunoAudioId`) and feed them to track-player; stream from the existing media endpoints.
- [ ] T07 -- On-device lock verification (REGEL #1): on a real device, lock 10+ minutes, background the app, take a call -- audio must survive each; lock-screen + Control Center controls drive playback. Document results in the summary.

## Done when

All tasks `[x]` and verified. Audio plays, continues through a 10+ minute screen lock and backgrounding, and is controllable from the lock screen on a real device. This slice alone retires the PWA's core defect.

## Notes

- track-player owns the queue + buffering + range requests; the PWA's Service-Worker range-caching concerns do not apply natively.
- Reuse the audio invariants from the web side: never `readFileSync` in hot paths (track-player streams URLs); effective task-id + clip-match rules above.
- T07 is the milestone's defining proof and cannot be faked -- needs a real device.

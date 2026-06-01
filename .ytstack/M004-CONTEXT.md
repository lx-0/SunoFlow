---
milestone: M004
project: SunoFlow
created: 2026-06-01T15:02:29Z
size: L
---

# M004 -- Context

## Goal

SunoFlow runs as a native iOS app (React Native + Expo) whose audio keeps playing
through a locked screen, with the library, player, and playlists usable natively.

## Exit criteria

- The iOS app builds via EAS and installs on a real device through TestFlight.
- Audio playback continues uninterrupted through screen lock, app backgrounding, and a
  10+ minute lock; lock-screen + Control Center transport controls (play/pause/next/prev/seek) work.
- A signed-in user (bearer-token auth) can browse + search their library, play any track,
  and view + play playlists, all in native UI.
- Tracks stream from the existing SunoFlow media endpoints (no new media backend).
- Background audio is proven by manual on-device verification (REGEL #1): lock 10+ min,
  switch apps, take a call -- audio survives each.

Explicit NON-criteria for M004 (deferred):
- **CarPlay** -- non-blocking bonus, gated on Apple's audio-app entitlement; own milestone.
- **Generate / Edit** (song generation, extend, mashup, stems) on mobile -- fast-follow milestone.
- **Android / Android Auto** -- Phase 2 milestone.

## Source

Pitch: `.ytstack/OFFICE-HOURS-native-app.md` (framework matrix, architecture, auth strategy).

## Decisions locked in discuss phase

- 2026-06-01: Framework = React Native + Expo, `react-native-track-player` v5 (audio),
  `react-native-carplay` (later). Rejected Capacitor (fails lock-audio + no first-class
  CarPlay), Flutter (no TS reuse), native Swift/Kotlin (2 codebases). See pitch §2.
- 2026-06-01: Platform = iOS first; Android + Android Auto deferred to a later milestone.
- 2026-06-01: UI = full native (no WebView hybrid).
- 2026-06-01: iOS-v1 scope = Browse + Play + Playlists. Generate/Edit deferred.
- 2026-06-01: CarPlay is a bonus, NOT an M004 exit criterion (entitlement is slow +
  uncertain, and the core lock-audio fix needs no Apple special approval). See pitch §7.
- 2026-06-01: Auth = bearer-token flow for the native client (new `/api/v1/auth/token`
  + `Authorization: Bearer` accepted alongside the existing NextAuth cookie path).
- 2026-06-01: M004 starts while M003 stays formally open on its manual T05 smoke-test
  (user-run, independent). current_milestone moves to M004; M003/S04/T05 remains a
  user TODO.
- 2026-06-01: Repo structure = **monorepo restructure APPROVED** by user (pnpm/Turborepo:
  apps/web + apps/mobile + packages/core). Web `pnpm build` must be verified locally
  before any push (prod-breaking risk: Dockerfile paths, NEXT_PUBLIC ARGs, standalone
  port handling).
- 2026-06-01: Distribution requires an **Expo development build** (custom dev client) --
  Expo Go cannot load track-player/carplay (custom native modules). Apple-account reality
  (verified): a **free Apple ID ("Personal Team")** can install the dev build on the
  user's OWN device and run the background-audio lock test (S03/T07) -- background-audio
  mode is allowed; caveat: 7-day provisioning expiry (weekly re-sign), globally-unique
  bundle id. The **paid ($99) account is needed only for** TestFlight distribution (S05),
  App Store, and CarPlay entitlement. User has NO paid account yet -> S05 + CarPlay
  blocked; S03 on-device proof is NOT blocked (free ID path).
- 2026-06-01: Headless build environment here has **no iOS simulator/device** -> RN/Expo
  runtime is NOT verifiable by the agent; on-device verification (esp. S03/T07) is the
  user's, via the free-ID dev build. Backend (S02) IS agent-verifiable via vitest.

## Open questions

- **Repo structure (GATED -- prod-breaking, needs explicit user OK before executing):**
  monorepo restructure of the live SunoFlow Next.js app (pnpm/Turborepo: `apps/web`,
  `apps/mobile`, `packages/core`) vs. a separate repo for the native app vs. additive
  `apps/mobile` without ripping apart the Next.js build. Planning proceeds assuming a
  monorepo end-state, but the first restructure step that touches the Railway
  deploy / Dockerfile / path config is gated on user approval.
- Native waveform approach (RN lib vs. precomputed peaks from `src/lib/audio/peaks.ts`).
- Whether to sign media URLs (media-proxy endpoints are currently public).
- Mobile model for long-running Suno generation (deferred with Generate/Edit, but note
  the SSE/polling seam in `src/lib/sse.ts`).

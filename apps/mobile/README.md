# SunoFlow Mobile (Expo / React Native) — M004

Native iOS app for SunoFlow. Goal: audio that survives screen lock + native
Browse/Play/Playlists. Pitch + plan: `../../.ytstack/OFFICE-HOURS-native-app.md`,
`../../.ytstack/M004-*.md`.

> ⚠️ **UNTESTED scaffold.** This was written in a headless env with no iOS
> simulator/device. Nothing here has been installed, typechecked, or run.
> Treat it as a starting skeleton, not working software. Verify on device (below).

## Status

Foundation skeleton for **M004-S01 / S03**:
- Expo Router shell (tabs: Library / Playlists / Settings) + Now-Playing modal.
- `react-native-track-player` setup (`src/playback/setup.ts`) with iOS `playback`
  category, lock-screen capabilities; playback **service** (`src/playback/service.ts`)
  registered in `index.js` for OS remote commands.
- iOS `UIBackgroundModes: ["audio"]` in `app.json` — the lock-screen-audio fix.
- Bearer-auth API client (`src/api/client.ts`) + secure-store session
  (`src/auth/session.ts`) — needs the M004-S02 backend (`/api/v1/auth/token`).
- Library screen plays the list; Player screen drives transport via track-player hooks.

Playlists/Settings are stubs (M004-S04). Domain types are a placeholder
(`src/types.ts`) until `packages/core` lands with the monorepo.

## Why a dev build (not Expo Go)

`react-native-track-player` is a custom native module — Expo Go cannot load it. You
need an **Expo development build**.

## Run it on your own iPhone (free Apple ID — no $99 account needed)

```bash
cd apps/mobile
npx expo install expo expo-router expo-secure-store expo-status-bar \
  react-native-track-player react-native-safe-area-context react-native-screens \
  react-native-gesture-handler react-native-reanimated   # aligns versions to the SDK
# set a globally-unique bundle id in app.json (ios.bundleIdentifier)
npx expo prebuild -p ios
# open ios/*.xcworkspace in Xcode, sign with your free "Personal Team",
# run on a connected iPhone (dev cert lasts 7 days, re-run to renew)
```

To point at a local backend: `EXPO_PUBLIC_SUNOFLOW_BASE_URL=http://<lan-ip>:3000`.

## Verify the milestone's core proof (M004-S03-T07)

On a real device: play a track, **lock the screen 10+ minutes**, background the app,
take a call. Audio must keep playing and the lock-screen controls must work. THIS is
the thing the PWA could not do.

## Paid account ($99) is only needed later for

TestFlight distribution (M004-S05), App Store, and CarPlay entitlement — none of which
block the on-device proof above.

# SunoFlow Mobile (Expo / React Native) — M004

Native iOS app for SunoFlow. Goal: audio that survives screen lock + native
Browse/Play/Playlists. Pitch + plan: `../../.ytstack/OFFICE-HOURS-native-app.md`,
`../../.ytstack/M004-*.md`.

> ⚠️ **UNTESTED scaffold.** Written in a headless env with no iOS simulator/device.
> Not installed, typechecked, or run. The expo-audio integration in particular is
> written from the docs and may need small API tweaks on the first dev build.

## Audio engine: expo-audio (not track-player)

Expo SDK 56 **forces the New Architecture** (`newArchEnabled: false` has no effect).
`react-native-track-player` v4 has no New-Arch support, and v5 (which does) is
**commercially licensed**. So the free, official, New-Arch path is **`expo-audio`**:
background playback (`enableBackgroundPlayback` plugin + `setAudioModeAsync`) +
lock-screen / Control Center controls (`setActiveForLockScreen`). expo-audio has no
built-in queue, so `src/playback/audio.ts` is a small queue controller around it.
CarPlay is not first-class in expo-audio — deferred (was a bonus, needs paid account anyway).

## Setup — install (fixes the chicken-and-egg)

`npx expo install` needs `expo` already present. So install first, then align:

```bash
cd apps/mobile
pnpm install            # installs expo (pinned ~56) + the rest
npx expo install --fix  # aligns react / react-native / expo-* / RN libs to the SDK
```

Then set a globally-unique bundle id in `app.json` (`ios.bundleIdentifier`).

## Run on your own iPhone (free Apple ID — no $99 account)

A **development build** is required (custom native modules aren't in Expo Go):

```bash
npx expo prebuild -p ios
# open ios/*.xcworkspace in Xcode, sign with your free "Personal Team",
# run on a connected iPhone (dev cert lasts 7 days, re-run to renew)
```

Point at a local backend: `EXPO_PUBLIC_SUNOFLOW_BASE_URL=http://<lan-ip>:3000`.
Log in with your SunoFlow email + password (the app calls `POST /api/v1/auth/token`).

## Verify the milestone's core proof (M004-S03-T07)

On a real device: play a track, **lock the screen 10+ minutes**, background the app,
take a call. Audio must keep playing and the lock-screen controls must work. THIS is
the thing the PWA could not do.

## Status

- Expo Router shell (Library / Playlists / Settings tabs + Now-Playing modal + mini-player).
- expo-audio background + lock-screen controls via `src/playback/audio.ts` queue controller.
- Bearer-auth API client + secure-store session; Library on real `GET /api/songs`;
  Playlists list + detail; library search; secure sign-out (server-side key revoke).
- Domain types are a placeholder (`src/types.ts`) until more move into `@sunoflow/core`.

Paid Apple account ($99) is only needed later for TestFlight (M004-S05) and the App Store.

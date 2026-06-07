# Maestro E2E flows (SunoFlow native)

[Maestro](https://maestro.mobile.dev) UI flows for the iOS app. The modern,
YAML-based RN/Expo E2E tool (simpler than Detox; runs on simulator **and** real
device). These flows drive the **real app build against the real backend** — the
native analogue of the web `e2e/agentic/` harness, but Maestro has no network
mocking, so the trade-offs differ (see Limitations).

## Flows

| File | What it does |
|------|--------------|
| `smoke.yaml` | login → library → search → **play a song** → assert player. The reliable core. |
| `background-audio.yaml` | plays, backgrounds, foregrounds, asserts the track persists. **Shallow** proxy — not the lock-gate. |
| `playlist.yaml` | creates a playlist (write path). Uses the empty-state CTA (selector caveat inside). |

## Prerequisites

1. **Install Maestro** (one-time):
   ```bash
   curl -fsSL "https://get.maestro.mobile.dev" | bash
   maestro --version
   ```
2. **A running app build** on a booted iOS Simulator (or connected device):
   ```bash
   # from apps/mobile/ — point the build at a backend (see below), then:
   pnpm ios            # debug dev build
   # or a release build on a device:
   pnpm release
   ```
   Maestro attaches to whatever build is installed (`appId: app.sunoflow.mobile`).
3. **A test account + a backend.** The app reads `EXPO_PUBLIC_SUNOFLOW_BASE_URL`
   (default `https://sunoflow.app`). Point a dev build at staging/local and use a
   throwaway account, **or** use a dedicated test account on prod:
   ```bash
   EXPO_PUBLIC_SUNOFLOW_BASE_URL=https://staging.example pnpm ios
   ```
   The account needs ≥1 existing song (the flows play, they don't generate).

## Run

Pass credentials + a known song-title substring as Maestro `env` params:

```bash
maestro test \
  -e EMAIL='you@example.com' -e PASSWORD='***' -e SONG_QUERY='Neon' \
  apps/mobile/.maestro/smoke.yaml

# whole suite:
maestro test -e EMAIL=… -e PASSWORD=… -e SONG_QUERY=… apps/mobile/.maestro/

# interactive selector explorer (great for fixing fragile taps):
maestro studio
```

## Limitations (read before trusting a green run)

- **Real backend, real writes.** No mocking. `playlist.yaml` creates real data;
  use a test account. Flows avoid generation, so **no Suno cost**.
- **The lock-audio gate is manual.** Maestro can't lock the screen or wait 10+
  min reliably. `background-audio.yaml` only proves the app survives a brief
  background. The **M004 milestone proof** — background audio surviving a 10+
  minute *screen lock* — must still be done by hand on-device: play a track,
  lock the phone, wait 10 min, confirm it's still playing + lock-screen controls
  work. A green Maestro run does **not** substitute for this.
- **Mostly text/accessibility selectors.** The app has few testIDs, so flows
  target visible text / placeholders / accessibilityLabels. Two previously
  unlabeled controls now carry stable hooks (added alongside these flows):
  - **play/pause** → `accessibilityLabel` "Play"/"Pause" + `testID: player-play-pause`;
  - **create-playlist "+"** → `accessibilityLabel` "Create playlist" + `testID: create-playlist`.
  Other dynamic rows (songs, playlists) are still matched by their text content.
- **Backgrounding semantics vary** by Maestro / simulator version (see the note
  in `background-audio.yaml`).

## Optional: AI-assisted assertions

Maestro supports `assertWithAI` / `extractTextWithAI` (needs an LLM API key) —
the native echo of the agentic web harness, useful for fuzzy checks like
"assert the player shows a playing state". Not used here to keep runs key-free
and deterministic.

## Note on app changes

These are **external** flow files — adding them changes no app behavior and needs
neither a JS reload nor a native rebuild. You only need an installed build to run
them against.

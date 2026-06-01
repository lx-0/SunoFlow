---
name: SunoFlow Native App
one-liner: A native iOS app for SunoFlow's power-users that keeps playback alive across screen lock and brings the library to CarPlay.
status: DRAFT
mode: brownfield-initiative
created: 2026-06-01
---

# Office Hours — SunoFlow Native App (iOS → Android)

Pitch artifact seeding a future ytstack milestone. The premise was not put through the
six forcing questions: this is a brownfield initiative on the maintainer's own product,
and the demand is settled by a concrete platform defect (PWA audio dies on screen lock)
plus a named capability gap (CarPlay). The work here is framework selection + a phased
plan, not demand validation.

**Downstream:** when M003 closes, run `plan-milestone` against this artifact, then
`slice-milestone`. The P0–P5 phases below map to slices. Do NOT scaffold a milestone
mid-M003 (`project_sunoflow_ytstack_adoption`).

## TL;DR

Ship SunoFlow as a **native React Native (Expo) app**, iOS first, because the PWA
cannot keep audio alive across screen lock and has no path to CarPlay. The native
audio stack (`react-native-track-player`) solves background playback at the root,
and `react-native-carplay` is the only mature framework path to a first-class
CarPlay audio experience. We rebuild the UI natively and reuse the TypeScript
business logic + the existing REST API.

### Locked decisions (2026-06-01)

| Decision | Choice | Why |
|---|---|---|
| Framework | **React Native + Expo**, `react-native-track-player` v5, `react-native-carplay` | Only stack with first-class CarPlay browsing + native background audio; keeps TS logic/API reuse |
| Platform order | **iOS first**, Android (incl. Android Auto) as Phase 2 | CarPlay is iOS-only and is the driving requirement; smallest first step, highest leverage |
| UI strategy | **Full native UI** (no WebView hybrid) | Real product-grade mobile UX, no double-render fragility, matches the "workbench" brand |

---

## 1. Why native (root cause, not symptom)

The PWA's audio dies on lock because mobile browsers (iOS Safari/WebKit especially)
suspend the JS execution context and the Web Audio / `<audio>` element when the app
is backgrounded or the screen locks. The Service Worker + MediaSession workarounds
already shipped (`reference_pwa_per_deploy_cache_busting`, `feedback_sw_range_caching`)
mitigate caching but cannot keep a WebKit audio context running through a long lock.
This is a platform limitation, not a bug we can patch.

Native fixes it at the root:
- **iOS**: `AVAudioSession` with the `playback` category + the `audio` background mode
  keeps playback alive indefinitely while locked, with system-level lock-screen and
  Control Center transport controls (`MPNowPlayingInfoCenter` / `MPRemoteCommandCenter`).
- **CarPlay**: requires a native CarPlay audio-app scene — impossible from a PWA, and
  not first-class in Capacitor.

`react-native-track-player` wraps all of the above. This is exactly the library music
apps use for this exact problem.

## 2. Framework decision matrix

| Stack | Background audio (lock) | CarPlay | Reuse from Next.js | Audio maturity | Verdict |
|---|---|---|---|---|---|
| **React Native** (`react-native-track-player` v5 + `react-native-carplay`) | Native, solved | **First-class** — `setBrowseTree()`, car-dashboard browsing | TS logic + REST API yes; UI no | Gold standard for music apps | **CHOSEN** |
| Flutter (`just_audio_background` + `flutter_carplay`) | Native, solved | Works, but `flutter_carplay` limited (no Siri, no multi-screen) | None (Dart rewrite) | Strong | Rejected — no TS reuse, less mature CarPlay |
| Capacitor (wrap existing Next.js) | **Fragile** — WebView audio, same lock problem; native-audio plugins buggy | **None** first-class | Maximal | Weak for serious audio | Rejected — fails the primary requirement |
| Native Swift + Kotlin | Best control | Best control | None | Highest | Rejected — 2 codebases, slowest time-to-beta |

Sources: [react-native-track-player](https://rntp.dev/) ·
[track-player GitHub](https://github.com/doublesymmetry/react-native-track-player) ·
[react-native-carplay](https://github.com/birkir/react-native-carplay) ·
[flutter_carplay](https://github.com/oguzhnatly/flutter_carplay) ·
[Capacitor background-audio issue](https://github.com/capacitor-community/native-audio/issues/40) ·
[Apple CarPlay Developer Guide](https://developer.apple.com/download/files/CarPlay-Developer-Guide.pdf)

## 3. Target architecture

```
┌─────────────────────────────────────────────┐
│  SunoFlow iOS app (Expo / React Native)       │
│                                               │
│  UI (native, rebuilt)                         │
│   Library · Player · Playlists · Generate ·   │
│   Edit · Settings                             │
│         │                                     │
│  Shared TS layer (ported from web)            │
│   zod schemas · API client · domain types ·   │
│   song lifecycle · formatters                 │
│         │                                     │
│  Audio service   ──▶ react-native-track-player│
│         │              (AVAudioSession,       │
│         │               lock screen, CarPlay  │
│         │               now-playing)          │
│  CarPlay scene  ──▶ react-native-carplay      │
│         │              (browse tree → library/│
│         │               playlists, now-playing)│
└─────────┼─────────────────────────────────────┘
          │ HTTPS (bearer token)
          ▼
   Existing SunoFlow backend (Next.js on Railway)
   REST route handlers · /api/v1 · media proxy · Suno API
```

- **One Expo app**, EAS Build for CI/CD and store submission.
- **Audio**: track-player is the single source of truth for the play queue,
  background playback, lock-screen controls, and the CarPlay now-playing card. The UI
  and CarPlay scene both subscribe to track-player state — no second player.
- **Streaming**: track-player streams song URLs directly (it handles its own buffering
  + range requests + optional caching), so the Service-Worker range-caching headaches
  from the PWA disappear. The app still fetches stream URLs from the existing media
  endpoints.

## 4. Code-reuse strategy

The big lever: the backend and business logic are reusable; only the UI is rebuilt.

**Reuse as-is (extract to a shared workspace package, e.g. `packages/core`):**
- Zod request/response schemas (`src/lib/**/request-schemas`, `zod-errors`)
- API client primitives (`src/lib/api-client.ts`, `fetch-client.ts` — swap cookie auth
  for bearer token)
- Domain types + transforms (`song-mappers`, `song-transform-guards`, `time-format`,
  `audio-metadata`)
- Song lifecycle rules (`src/lib/songs/lifecycle.ts` — the generationStatus/archivedAt
  state machine, `project_song_lifecycle_seam`)
- Pure helpers: pagination, query-params, sanitize, result

**Rebuilt natively (cannot port React-DOM components):**
- Every screen / component (RN primitives, not DOM)
- Navigation (Expo Router or React Navigation)
- Waveform rendering (wavesurfer.js is DOM-only → replace with an RN waveform lib or
  precomputed peaks from `src/lib/audio/peaks.ts` rendered on a native canvas/SVG)

**Backend reuse**: the entire `/api` surface stays. `/api/v1/openapi.json` already
documents a public API; lean on it as the native contract.

## 5. Auth for native (the biggest gap)

The web app uses NextAuth v5 with the **JWT session strategy** stored in a cookie
(`src/lib/auth/session.ts`, `reference_jwt_lastloginat_trap`). A native app can't use
cookies + the web sign-in redirect cleanly. Decide an auth flow:

- **Recommended**: token-based auth — native sign-in (email/password via the existing
  credentials provider + Google via native OAuth/`expo-auth-session`) returns a
  bearer/refresh token the app stores in the secure keychain (`expo-secure-store`).
  Add a `/api/v1/auth/token` exchange endpoint and accept `Authorization: Bearer` on
  API routes alongside the existing cookie path.
- Honor the existing **invite-only registration gate** (`project_sunoflow_invite_only_registration`)
  and the `PLAYWRIGHT_TEST` bypass contract for any new auth surface
  (`feedback_registration_gate_playwright_bypass`).
- Admin OR-merge must hold on both sites if any admin surface is exposed
  (`feedback_env_admin_or_merge_both_sites`).

Media-proxy endpoints are already public (`feedback_sunoflow_middleware_media_proxies_public`),
which conveniently lets track-player stream without auth headers — but note this as a
security consideration (unauthenticated media URLs) and decide whether to sign URLs.

## 6. Audio architecture (`react-native-track-player`)

- Configure `AVAudioSession` category `playback`, enable `audio` background mode in the
  Info.plist (Expo config plugin).
- Register a playback service that maps remote-command events (play/pause/next/prev/seek)
  to track-player.
- Populate now-playing metadata (title, artist/persona, cover art) for lock screen,
  Control Center, and CarPlay from the song model.
- Queue model maps to SunoFlow playlists + the current library view.
- Verify behavior the only way that counts (REGEL #1): lock the device, lock for 10+
  minutes, switch apps, take a call — audio must survive each.

## 7. CarPlay design + Apple entitlement gate (nice-to-have, NOT a blocker)

CarPlay for an audio app needs the **CarPlay audio app entitlement** from Apple, which
must be **requested and approved separately** and can take **days to months** (variable;
some get it in days, others wait months)
([CarPlay Developer Guide](https://developer.apple.com/download/files/CarPlay-Developer-Guide.pdf) ·
[Requesting CarPlay Entitlements](https://developer.apple.com/documentation/carplay/requesting-carplay-entitlements)).

**Hobby status does not exempt you.** The entitlement is account-level, not
commercial-tier-gated. Facts:
- Requested at [developer.apple.com/carplay](https://developer.apple.com/carplay/);
  only the **Team Agent** (account holder) may submit. Requires a **paid Apple Developer
  account** (~99 €/yr). There is no free/hobby CarPlay path and no sideload-CarPlay.
- Apple reviews manually whether the app fits a CarPlay category. A music player fits the
  **Audio** category cleanly — the most readily-approved category — but approval is not
  guaranteed.
- Distribution method is irrelevant: **even TestFlight CarPlay needs the entitlement.**

**The decoupling that matters:** the core pain (audio dies on lock) is fixed by the plain
`audio` background mode and needs **zero** Apple special approval. Only CarPlay *on a real
head unit* depends on the entitlement; CarPlay can be developed/tested in the Xcode
**simulator** without it.

| Capability | Needs CarPlay entitlement? |
|---|---|
| Background audio surviving screen lock (the primary fix) | **No** — ordinary background mode |
| Lock screen / Control Center transport controls | No |
| CarPlay in a real car | **Yes** |
| Developing/testing CarPlay in the Xcode simulator | No |

**→ Submit the entitlement request on day one anyway** (it's the long pole and free to
ask), but treat CarPlay-in-the-car as a bonus that ships *if/when* Apple approves — never
as a gate on the rest of the app.

CarPlay UX (audio-app templates only — list/grid/now-playing, no custom UI):
- **Browse tree** (`setBrowseTree()`): top level → Playlists, Recently Played, Library
  (by most-recent). Drill into a playlist → track list → tap plays via the same
  track-player queue.
- **Now Playing** template: transport controls + cover art, driven by track-player.
- Keep it shallow and glanceable — CarPlay enforces list-depth and item-count limits
  for driver safety.

## 8. Backend changes required

Mostly additive — the API already exists:
1. Bearer-token auth path on API routes (Section 5).
2. `/api/v1/auth/token` + refresh endpoint.
3. A native-friendly "now playing queue" / playlist-tracks endpoint shaped for the
   CarPlay browse tree (can reuse existing playlist endpoints).
4. Optional: signed media URLs if we decide unauthenticated stream URLs are a risk.
5. Push: there's already `web-push`; native push needs APNs via Expo notifications
   (Phase 2+, not required for the core fix).

## 9. Phased roadmap (iOS first)

Sized for a solo operator with Claude Code (CC). "Beta" = TestFlight to the closed circle.

| Phase | Goal | Key work | Size |
|---|---|---|---|
| **P0 — Foundations** | App boots, signs in, hits the API | Expo app scaffold, EAS Build CI, `packages/core` extraction, bearer-token auth flow + backend endpoint, secure-store session. **Submit CarPlay entitlement request here.** | M |
| **P1 — Core playback (the fix)** | Background audio that survives lock | track-player integration, playback service, lock-screen/Control-Center controls, library list + player screen, stream from existing media endpoints. **This phase alone retires the PWA's core defect.** | L |
| **P2 — Full native UI** | Browse/Play/organize at parity | Library, search, playlists (incl. reorder), favorites/reactions, native waveform, settings. Generate + Edit flows ported (lighter than desktop). | XL |
| **P3 — CarPlay** | First-class in-car listening | CarPlay scene, browse tree (playlists/recent/library), now-playing card, simulator + real-device testing once entitlement lands. | L |
| **P4 — Beta + App Store** | Shipped to the circle, then public | TestFlight build, closed-beta feedback loop, App Store metadata/screenshots/privacy, review submission (CarPlay review is stricter). | M |
| **P5 — Android + Android Auto** | Second platform | Android build, Android Auto via track-player's MediaBrowserService, Play Store. | L |

Note: P1 (the core background-audio fix) has **no dependency on Apple's CarPlay
approval** — it ships value on its own. The entitlement request goes out in P0 only
because it's free to ask and slow to grant; if approval lands, P3 turns CarPlay on, if it
doesn't, the rest of the app is unaffected. CarPlay is a bonus, not a gate (see §7).

## 10. Distribution & release

- **EAS Build + EAS Submit** for both stores.
- iOS: TestFlight for the closed beta first (matches the invite-only product posture),
  then App Store. CarPlay apps get extra review scrutiny — budget for a rejection round.
- Keep the PWA live in parallel as the desktop/web workbench; the native app is the
  mobile + car surface, not a replacement for the desktop "Generate/Edit" loop
  (per `PRODUCT.md`, desktop is the generation center of gravity).

## 11. Risks & open questions

- **CarPlay entitlement approval time** — slow and uncertain (days to months), and a
  paid Apple Developer account is required; hobby status grants no exemption. Mitigation:
  it is NOT on the critical path — the core fix ships without it; submit day one and
  develop against the simulator meanwhile, treat real-car CarPlay as a bonus (see §7).
- **Full-native-UI is XL** — the app has ~70 feature domains. Not all need to be on
  mobile at launch; recommend P1/P2 prioritize Browse + Play + Playlists (the natural
  mobile/CarPlay surface) and treat Generate/Edit as fast-follow. **Open question: which
  features are in the iOS v1 scope vs deferred?**
- **Auth migration** — bearer tokens alongside NextAuth cookies needs care so web and
  native stay consistent; watch the JWT lastLogin/active-user seam.
- **Waveform** — wavesurfer.js doesn't exist on RN; need an RN waveform solution or
  render precomputed peaks. Small but real.
- **Two UI codebases** — web (Next.js) + native (RN) UIs diverge over time; the shared
  `packages/core` limits this to presentation only.
- **Suno generation on mobile** — long-running generation + queue polling/SSE
  (`src/lib/sse.ts`) needs a mobile-appropriate model (background fetch / push on
  completion) rather than a held-open connection.

## 12. Open question for the milestone

**iOS v1 scope.** Full-native-UI across ~70 feature domains is XL. Decide before
`plan-milestone` which features ship in iOS v1 (proposed: Browse + Play + Playlists)
vs fast-follow (Generate + Edit). This bounds P2 and the milestone size.

## 13. First concrete action

Before any code: **create the Apple Developer CarPlay audio-app entitlement request**
(needs the paid account + Team Agent). It's the slowest, most uncertain step but free to
start, and it's off the critical path so everything else proceeds in parallel.

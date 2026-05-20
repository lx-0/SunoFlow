---
milestone: M001
slice: S01
task: T05
artifact: MOBILE-AUDIT
created: 2026-05-18T08:10:00Z
sources:
  - grep tailwind breakpoints in src/**/*.tsx (296 hits across 50 files)
  - grep matchMedia / useMediaQuery / isMobile in src (8 distinct viewport branches)
  - public/manifest.json (PWA manifest, 640 bytes)
  - public/sw.js (Service Worker, per-deploy cache namespacing)
  - src/components/{BottomSheet,SwipeablePlaylistItem,PullToRefreshContainer,PwaInstallPrompt,OfflineIndicator,ServiceWorkerRegistrar,ExpandedPlayer,AppShell}.tsx
  - src/components/library/{song-grid-card,swipable-song-row}.tsx
  - src/components/SongListItem.tsx (long-press)
  - src/lib/cache/offline.ts (offline cache primitives)
  - tailwind.config.ts (default breakpoints, no custom overrides)
totals:
  tailwind_breakpoint_usages: 296
  files_with_breakpoints: 50
  matchmedia_branches: 8
  touch_handler_files: 6
  swipe_files: 4
  offline_cache_consumers: 4
---

# M001 Mobile / PWA Audit

Inventur der Mobile-Spezifik im Code. Beantwortet: ist die App Mobile-First, Desktop-Adapted, oder Mixed? Welche Surfaces reagieren auf Viewport, welche nicht? Was kostet eine IA-Aenderung mobile?

---

## A. Viewport-conditional rendering

### A.1 Tailwind breakpoint usage (CSS-level)

Tailwind-Default-Breakpoints (no custom overrides in `tailwind.config.ts`): `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px.

**296 distinct breakpoint-class usages across 50 files.**

| Breakpoint | Usages | % | Anchor |
|---|---:|---:|---|
| `sm:` | 152 | 51% | 640px+ |
| `md:` | 111 | 38% | 768px+ (the desktop pivot) |
| `lg:` | 25 | 8% | 1024px+ |
| `xl:` | 8 | 3% | 1280px+ |
| `2xl:` | 0 | 0% | -- |

**51% of responsive switches happen at `sm:` (640px), 38% at `md:` (768px).** Almost no large-screen-specific styling (`lg/xl/2xl` together = 11%). Reading: **the app's responsive logic targets the mobile-to-tablet transition, not the tablet-to-desktop transition.**

### A.2 Top files by breakpoint usage

| File | Usages | Notes |
|---|---:|---|
| `GlobalPlayer.tsx` | 32 | Persistent bottom player must adapt mobile vs desktop |
| `LibraryView.tsx` | 24 | Grid sizing, toolbar collapse |
| `AppShell.tsx` | 20 | Sidebar visible only `md:` and up (`hidden md:flex`) |
| `DiscoverView.tsx` (app/[locale]/discover/) | 20 | Card grid |
| `LandingPage.tsx` | 16 | Marketing surface |
| `PlaylistDetailView.tsx` | 14 | Mobile-vs-desktop split |
| `PublicSongView.tsx` (app/s/[slug]/) | 14 | Public share surface |
| `GenerateForm.tsx` | 10 | Modest -- form mostly stacks vertically |
| `ExpandedPlayer.tsx` | 10 | Fullscreen player |
| `AdminShell.tsx` | 9 | Admin sub-layout |

### A.3 JS-level viewport branches (8 distinct)

Code that *reads* the viewport at runtime (not just CSS):

| Location | Pattern | Purpose |
|---|---|---|
| `src/app/{[locale],s,p,u,songs}/layout.tsx` | `matchMedia("(prefers-color-scheme: dark)")` (5 instances) | Theme bootstrap, not viewport-size |
| `src/components/ThemeProvider.tsx:19,63` | `matchMedia("(prefers-color-scheme: dark)")` (2 instances) | Theme follow-system |
| `src/components/GlobalPlayer.tsx:122-125` | `matchMedia("(min-width: 768px)")` | "isDesktop" check at click-time to decide click-target behavior |
| `src/components/LibraryView.tsx:335` | `matchMedia("(pointer: coarse)")` | Mobile-only gesture path (long-press / swipe-friendly UI) |
| `src/components/library/swipable-song-row.tsx:52` | `matchMedia("(pointer: coarse)")` | Same -- swipe row only enabled on coarse pointer |
| `src/components/PwaInstallPrompt.tsx:21,27,50` | `isMobile()` + `(display-mode: standalone)` | "Add to home screen" CTA gating |

**Sieben theme-checks vs. drei echte viewport/pointer-checks.** Die App entscheidet mobile-Spezifik fast immer via Tailwind, selten in JS. Drei JS-branches: GlobalPlayer-Click, LibraryView-Gesten, SwipableSongRow-Gesten -- alle drei sind "this only happens on touch".

---

## B. Mobile-specific components & flows

### B.1 Touch-handler distribution

6 Files mit `onTouchStart`/`onTouchEnd`/`onTouchMove`:

| File | Touch usage | Long-press |
|---|---|---|
| `SongListItem.tsx` | onTouchStart/End/Move (`longPressTimer.ref`) | ✓ -- `onLongPress(songId)` prop (line 387), 500ms timer (lines 435-456) |
| `BottomSheet.tsx` | Touch handlers for swipe-to-dismiss | -- |
| `PlayerWaveform.tsx` | Touch for waveform-seeking | -- |
| `PlaylistDetailView.tsx` | Touch for swipe-to-action on rows | -- |
| `LibraryView.tsx` | Touch handler (likely passthrough to song-grid-card) | -- |
| `library/song-grid-card.tsx` | Touch on card | -- |

Long-press only in `SongListItem.tsx`. **Pointer-events** (`onPointerDown`/`onPointerUp`) only in 1 file (likely AppShell drawer).

### B.2 Swipe surfaces

4 files referencing `swipe`/`Swipe`:

| File | Pattern |
|---|---|
| `BottomSheet.tsx` | Swipe-to-dismiss the sheet |
| `SwipeablePlaylistItem.tsx` | Swipe-to-delete on playlist rows |
| `AppShell.tsx` | `useSwipeToDismiss` hook on mobile drawer (line 222-223) |
| `PlaylistDetailView.tsx` | Swipe-action on playlist songs |

### B.3 Mobile-only components

| Component | Consumers (T02) | Role |
|---|---:|---|
| `BottomSheet.tsx` | 1 (`PlaylistDetailView`) | Slide-up sheet primitive |
| `SwipeablePlaylistItem.tsx` | 1 | Swipe row |
| `PullToRefreshContainer.tsx` | 2 | Pull-to-refresh wrapper |
| `library/swipable-song-row.tsx` | 1 | Swipe-able song row variant |
| `OfflineIndicator.tsx` | 1 | "You're offline" banner |
| `PwaInstallPrompt.tsx` | 1 | "Add to home screen" prompt |
| `ExpandedPlayer.tsx` | 1 (`GlobalPlayer:797`) | Fullscreen player, single trigger |

**Pattern: each mobile primitive has exactly 1 consumer.** Either the primitives are correctly dosed (one canonical use per primitive) or they are under-utilised (e.g. `BottomSheet` could replace some `Modal` usages on mobile). T02 already flagged this; S02 should decide.

### B.4 AppShell mobile-nav pattern

`AppShell.tsx` is responsive-first, not mobile-only:

- **Sidebar** (`<aside aria-label="Main navigation" className="hidden md:flex md:flex-col ...">`): visible only at `md:` (768px+), hidden below.
- **Mobile drawer** (lines 75, 114, 222-223): focus-trap + swipe-to-dismiss. Trigger via hamburger.
- **Sidebar collapse state** persisted in `localStorage.getItem("sidebar-collapsed")` (lines 226-240).
- **Touch-target rule:** `min-h-[44px]` on every nav-item link (line 294) -- Apple HIG-grade hit area.
- **Item rendering** identical between collapsed + drawer + expanded; only the icon-vs-label visibility flips (line 301: `{!sidebarCollapsed && label}`).

**No separate mobile bottom-nav.** All 17 items live in the drawer on mobile. On desktop in the sidebar. Consistency is good for IA work; redesign that introduces a mobile-bottom-nav would be a real architecture change, not a CSS tweak.

---

## C. PWA infrastructure

### C.1 Manifest (`public/manifest.json`, 640 bytes)

```json
{
  "name": "SunoFlow — Personal Music Manager",
  "short_name": "SunoFlow",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f9fafb",
  "theme_color": "#7c3aed",
  "icons": [192/512 + 512-maskable]
}
```

- **`display: "standalone"`** -- runs as a "real app" once installed.
- **No `shortcuts`** -- no homescreen-shortcut entries (e.g. "Quick Generate"). Could be a low-cost UX win post-M001.
- **No `share_target`** -- the app doesn't register as a share target. Same low-cost-win category.
- **No `icons` with `purpose: any maskable`** in the same blob -- separate entries (line 17+18).

### C.2 Service Worker (`public/sw.js`)

Per-deploy cache namespacing driven by `BUILD_ID` query param (siehe Memory: `NEXT_PUBLIC_BUILD_ID`):

```js
const BUILD_ID = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE_NAME   = `sunoflow-shell-${BUILD_ID}`;
const STATIC_CACHE = `sunoflow-static-${BUILD_ID}`;
const API_CACHE    = `sunoflow-api-${BUILD_ID}`;
const AUDIO_CACHE  = "sunoflow-audio-v2";   // stable across deploys
```

- 4 cache namespaces. 3 are deploy-coupled (evicted on activate), 1 is stable (`AUDIO_CACHE` -- user-saved offline songs).
- **Activate handler evicts all non-keep caches** -- old shell/static/api bundles cannot resurface.
- `MAX_AUDIO_ENTRIES = 20`, `MAX_STATIC_ENTRIES = 100` -- LRU eviction caps.
- Precache: only `/offline.html`. Aggressive on-demand strategy.

### C.3 ServiceWorkerRegistrar (`src/components/ServiceWorkerRegistrar.tsx`)

- Registers `/sw.js?v=<BUILD_ID>` (line 31-32).
- **Update check every 60 seconds** (`UPDATE_CHECK_INTERVAL_MS = 60_000`).
- **Auto-reload UX** (`SAFE_AUTO_RELOAD_DELAY_MS = 5_000`) **only if no audio is playing** (`isAudioPlaying()` checks `mediaSession.playbackState` + `<audio>` element).
- Banner-driven user-facing prompt: "New version available -- reload?"

### C.4 PWA-adjacent components

| Component | Role |
|---|---|
| `PwaInstallPrompt.tsx` | "Add to home screen" CTA. Gated by `isMobile() && !isStandalone() && !isDismissed()`. |
| `OfflineIndicator.tsx` | Banner when `navigator.onLine === false`. |
| `ServiceWorkerRegistrar.tsx` | SW registration + update lifecycle (oben). |

---

## D. Gesture / interaction patterns inventory

| Gesture | Files | Notes |
|---|---|---|
| Long-press | 1 (`SongListItem`) | 500ms timer; triggers `onLongPress(songId)` -- presumably opens selection / context menu |
| Swipe (generic) | 4 (`BottomSheet`, `SwipeablePlaylistItem`, `AppShell` drawer, `PlaylistDetailView`) | Each surface implements its own swipe handlers; no shared hook |
| Touch start/move/end | 6 files | Distributed; no `useSwipe` / `useTouch` hook in `src/hooks/` |
| Pointer events | 1 file | Edge case |

**No shared gesture-hook library.** Each consumer rolls its own touch math. If S03/M002+ adds another swipe surface, expect duplication.

---

## E. Offline / cache surfaces

`src/lib/cache/offline.ts` is the primitive layer:

- **Storage backend:** `Cache API` for audio binaries + `localStorage` for metadata. **No IndexedDB / `idb` / `dexie`** used anywhere in the codebase.
- **Default eviction threshold:** 500 MB (`DEFAULT_LIMIT_BYTES`).
- **Metadata shape:** `{ id, title, imageUrl, cachedAt, size }`.

Consumers (4):
- `LibraryView.tsx` -- shows offline-toggle on songs.
- `SongDetailView.tsx` -- per-song offline toggle.
- `SongsGalleryView.tsx` -- offline-state in gallery.
- `src/app/[locale]/settings/local-preferences-sections.tsx` -- settings page for cache size + clear.

**Consistent surface.** Offline-toggle is integrated into the song-listing paths and centrally managed in settings. No fragmentation.

---

## F. Cross-cutting observations (for S02/S03)

1. **The app is responsive-from-mobile, not mobile-first.** 51% of breakpoint switches at `sm:`, 38% at `md:`. Desktop styling is the *additive* layer over mobile defaults. IA redesign that assumes desktop-first wouldn't match the codebase grain.
2. **`md:` (768px) is THE desktop pivot.** Sidebar appears, dropdowns instead of bottom-sheets. Any responsive design decision should respect this single breakpoint -- introducing a new mid-breakpoint would touch ~50 files.
3. **17-item nav stays 17-item on mobile.** Drawer renders the same list as desktop sidebar. **A mobile-bottom-nav redesign would be net-new work**, not a CSS refactor. S02 must decide: keep one-list or split for mobile.
4. **Mobile primitives are under-utilised but consistently used.** `BottomSheet` has 1 consumer, `SwipeablePlaylistItem` has 1, `PullToRefreshContainer` has 2. None are wrong; they're just only-where-needed. S02 can either expand BottomSheet usage to replace mobile Modal renderings, or leave alone.
5. **Long-press is rare** (1 file). Selection-mode UI could be standardised around it but currently isn't. Low priority, observation-only.
6. **No shared gesture library.** Adding more swipe/longpress surfaces in M002+ will duplicate logic unless we extract `useSwipe`/`useLongPress` first. **DECISIONS-Entry-Kandidat** -- but for M002+, not M001.
7. **PWA infra is well-engineered.** Per-deploy cache namespacing, audio-aware auto-reload, manifest, install prompt -- the mobile substrate is mature. UX work doesn't need to fix PWA, can build on it.
8. **PWA gaps that are cheap UX wins** (post-M001): manifest `shortcuts` (homescreen quick-actions like "Quick Generate"), manifest `share_target` (let users share from other apps into SunoFlow).
9. **Theme detection dominates `matchMedia` usage** (7 of 10 calls). Real viewport branching is 3 calls. The mental model "this app responds to screen size at runtime" is wrong -- it responds at *touch capability* (pointer: coarse), almost never at width.
10. **Audio cache survives deploys, shell cache doesn't.** Worth knowing during S03: any offline-playback UX changes should respect that user-saved songs persist; shell-UX changes are evicted immediately on new deploy.

---

End of mobile audit.

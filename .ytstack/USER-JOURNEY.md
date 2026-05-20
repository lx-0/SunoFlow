---
project: SunoFlow
version: 0.2.1
created: 2026-05-18T08:35:00Z
primary_loop: Generate → Listen → Refine → Share
secondary_loops:
  - Discover (5 Surfaces: discover/explore/radio/feed/inspire)
  - Social (comments, ratings, follows, reactions)
  - Engage (streaks, milestones, notifications, RSS digest)
  - Analytics (4 Surfaces: analytics/stats/insights/dashboard-analytics)
  - Admin (12 admin pages, separate sub-app)
sources:
  - .ytstack/PROJECT.md
  - README.md (first paragraph)
  - .claude-plugin/plugin.json (plugin description)
  - lx-0/skills/marketplace.json (marketplace description)
  - .ytstack/FEATURE-MAP.md §1+§2 (mental model + 10 bounded contexts)
  - S01 outputs (ROUTE-CATALOG, COMPONENT-MAP, FEATURE-GAPS, FRICTION-AUDIT, MOBILE-AUDIT)
status: in-progress
populated_sections:
  - §1 App-Concept-Statement (T01, this commit)
pending_sections:
  - §2-§8 Hauptpfade (T02)
  - §9 Coverage-Matrix (T03)
---

# SunoFlow User Journey

This document is the canonical view of *who uses SunoFlow, what they do, in what order, and where the friction lives*. It is the basis for the IA-Konsolidierungs-Map (M001-IA-MAP.md, T04) and the Generate-Redesign-Skizze (M001-GENERATE-REDESIGN.md, S03).

§1 lockt das App-Konzept ein -- alle weiteren Sektionen referenzieren zurueck auf den hier definierten Primaer-Loop und die Persona.

---

## §1. App-Concept-Statement

### What SunoFlow is (in 3 sentences)

1. **SunoFlow is a personal music-production cockpit for [Suno API](https://sunoapi.org) users** -- a mobile-first PWA that wraps Suno's generation API with the things Suno's own UI is missing: a real library, playlists, public sharing, lyric workflows, persona-based prompt presets, and a persistent waveform player.

2. **It is a single-tenant tool**: each user plugs in their own Suno + OpenAI keys, owns their songs, pays for their own credits, and decides what to publish via shareable slugs (`/s/[slug]`, `/p/[slug]`). There is no shared catalog; there is no platform-mediated discovery -- only the *user's* library plus optional public surfacing of what *they* share.

3. **At the architectural heart sits one load-bearing flow: the generation pipeline** (prompt → Suno API → polling/SSE → song row → playback) -- everything else (library, playlists, discovery, social, analytics, engagement) exists to feed or consume that flow.

### Persona

**The Suno Power-User who wants more than the Suno UI gives them.**

Specifically:
- Already has a Suno account and pays for Suno credits (the app does not generate for free; credits come from the user's plugged-in API key).
- Treats music generation as an ongoing creative practice, not a one-off novelty -- generates dozens to hundreds of songs, needs library hygiene (favorites, playlists, history, tags, smart-playlists).
- Wants to *refine* what they generate (lyric edits, cover art, variations, remixes, stem separation, MIDI export, WAV conversion) rather than only consume the raw output.
- Optionally wants to *share* -- via public-slug pages, RSS feeds, embed widgets, social follows. Sharing is not the primary product, but it's a real loop.
- Predominantly mobile (51% of UI breakpoints fire at `sm:`, only 11% at `lg/xl/2xl`). The app must work on a phone with thumb-reach -- this constrains every IA decision.

What this persona is **not**:
- Not a passive listener with a curated playlist habit (Spotify-grade). Discovery exists but it's narrow -- shared-by-other-users songs, not licensed catalog.
- Not a multi-user collaborator (playlists support collaborators, but the primary mode is solo).
- Not an enterprise admin tier (the `/admin/*` sub-app is operator-facing, not a customer tier).

### Primary loop

Four steps. Every other surface in the app serves this loop or branches off it.

```
                 ┌──────────────────────────────────────────────────┐
                 │                                                  │
                 ▼                                                  │
    ┌─────────────────────┐     ┌──────────────────────┐            │
    │  1. GENERATE        │     │  2. LISTEN           │            │
    │  /generate +        │ ──▶ │  GlobalPlayer +      │            │
    │  GenerationProgress │     │  /library /[id] etc. │            │
    └─────────────────────┘     └──────────┬───────────┘            │
                                            │                       │
                                            ▼                       │
                                ┌──────────────────────┐            │
                                │  3. REFINE           │            │
                                │  SongDetailView      │            │
                                │  + 7 modals          │            │
                                │  (variations, lyrics │            │
                                │  cover-art, stems...) │           │
                                └──────────┬───────────┘            │
                                            │                       │
                                            ▼                       │
                                ┌──────────────────────┐            │
                                │  4. SHARE  (optional)│            │
                                │  /s/[slug] /p/[slug] │            │
                                │  /embed/* + RSS      │            │
                                └──────────┬───────────┘            │
                                            │                       │
                                            └───────────────────────┘
                                              feedback / new ideas
                                              ─▶ back to GENERATE
```

The loop is **explicit in the FEATURE-MAP god-objects**:
- Step 1 = `GenerateForm.tsx` (1421 LOC, 30 useState, 0 props, 44 commits since Jan)
- Step 2 = `GlobalPlayer.tsx` + `QueueContext.tsx` (1656 combined LOC, 71 commits since Jan)
- Step 3 = `SongDetailView.tsx` (1527 LOC, 39 useState, 35 onClicks, 7 modals, 57 commits since Jan)
- Step 4 = `PublicSongView.tsx` (`/s/[slug]`, 37 commits) + `PublicPlaylistView` + embed widgets

If the four god-objects feel overloaded (T04 confirms they are), it's because each one is the primary surface for *its loop step* and absorbs every feature added to that step.

### Secondary loops

Real but subordinate. Each has its own surfaces and audience, but they serve the primary loop rather than replace it.

| Loop | Trigger | Surfaces today | Role in journey |
|---|---|---|---|
| **Discover** | Look for inspiration before generating | `/discover` `/explore` `/radio` `/feed` `/inspire` (5 surfaces) | Feeds back into Generate (Step 1) with prompt ideas |
| **Social** | Engage with songs / users | comments, ratings, reactions, follows on per-song + user pages | Refines what to share (Step 4); occasional discovery hook |
| **Authoring helpers** | Build prompt-craft toolkit | `/personas` `/templates` `/style-templates` (3 surfaces) | Feeds Step 1 (Persona/Preset state in GenerateForm) |
| **Engage** | Streaks, milestones, notifications, RSS digest | `/notifications` `/stats` + push + email digests | Long-tail retention loop pulling user back into Step 1 |
| **Analytics** | Self-reflection on the loop | `/analytics` `/stats` `/insights` `/dashboard/analytics` (4 surfaces) | Meta-loop: user sees their own activity, decides what to do next |
| **Admin** | Platform operation | `/admin/*` (12 surfaces, separate sub-app) | Out-of-band, not part of user journey |

S01 surfaced *very strong* consolidation pressure on the secondary loops: 5 Discovery surfaces, 4 Analytics surfaces, 3 Authoring tops. Section §2-§8 will treat each loop as its own journey-path and section §9 will assign every existing route to exactly one loop's home.

### Honest scope acknowledgment

The marketing one-liner ("a mobile-first PWA for managing Suno music") undersells the app. The current code contains:

- **51 Prisma models** (not the 47 the inventory claims)
- **56 user-facing pages + 5 public surfaces**
- **224 API routes**
- **101 React components**
- **10 bounded contexts** in FEATURE-MAP §2

The product is bigger than it advertises. That's the honest read. **The job of M001 is not to remove features but to give every existing feature a clear home in the journey** -- and to entlasten the surfaces (Generate, Library, SongDetail) where loop-step density has produced friction.

### Explicit non-goals for this journey doc

- Not a marketing positioning doc. (No "value props" / "why now" / "competitive landscape" sections.)
- Not a feature inventory. (`docs/feature-inventory.md` exists for that, even if 19% drifted.)
- Not a redesign proposal. (S03 owns the Generate-Redesign-Skizze; this doc owns the journey + IA decisions that *constrain* the redesign.)

---

## §2. Onboarding

**Primary loop step:** Pre-loop (gets the user to Step 1).
**Surface(s):** `/` (LandingPage), `/register`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password`, `/profile` (post-onboarding API-key setup).
**Components:** `LandingPage` (4 commits), `ApiKeyWizard` (6 commits), `OnboardingTour` + `OnboardingTourUI` (11 commits combined), `EmailVerificationBanner` (4 commits), `Confetti` (lazy-loaded).

### Steps

1. **Land** -- `/` shows the marketing `LandingPage`. CTA → `/register` or `/login`.
2. **Authenticate** -- `/register` (email/password) or `/login` (incl. Google OAuth via NextAuth). On success: redirect to `/` (now authed) OR `/verify-email` if email unverified.
3. **Email-verify** -- `/verify-email` page reads the magic-link token. `EmailVerificationBanner` (4 commits) appears in `AppShell` until verified.
4. **API-key setup** -- `ApiKeyWizard.tsx` (sole consumer is `/profile`?) collects Suno + OpenAI keys, stores via `/api/profile/api-key`. `User.onboardingCompleted` flag flips when complete.
5. **Guided tour** -- `OnboardingTour.tsx` (with `OnboardingTourUI.tsx` for steps). Highlights `nav-generate`, `nav-favorites`, `nav-inspire` via `dataTour` attrs in `AppShell` (`AppShell.tsx:56-72`).
6. **First generation** -- user lands on `/generate` (tour final step), submits the form, `Confetti.tsx` (lazy-imported in `GenerateForm`) fires on first success.

### Friction points

- **Onboarding is fragmented across 6 routes** (`/`, `/register`, `/login`, `/verify-email`, `/profile`, `/generate`) plus 4 components. No single "Onboarding hub" page -- the funnel is implicit.
- **`ApiKeyWizard` is a critical-path component but lives inside `/profile`** -- new users have to find their way there from the tour. T01 didn't even surface `ApiKeyWizard` as a dedicated route.
- `EmailVerificationBanner` is a persistent reminder, but the user can dismiss tasks (generate songs) without verifying -- gates are soft.
- `Confetti` runs on first-generation success only via `hasFeedbackBeenSubmitted` flag in `InAppFeedbackWidget`. Logic for "first" is in localStorage, fragile under cache-clears.

### Mobile-specific notes

- `LandingPage` has 16 tailwind breakpoint usages -- responsive-from-mobile-first (per MOBILE-AUDIT §A.2).
- `PwaInstallPrompt.tsx` (gated by `isMobile() && !isStandalone() && !isDismissed()`, MOBILE-AUDIT §A.3) shows during onboarding on mobile, encouraging "Add to Home Screen" -- becomes part of the onboarding loop only on phones.

### Open IA questions for T04

- Should "API-key setup" be a dedicated onboarding step (gating route) rather than a profile subsection? Today it's discoverable only via tour or `/profile`.
- Should there be a single `/onboarding` hub that walks through all 6 routes, vs. the current implicit funnel?
- Where does post-onboarding state ("you have completed onboarding") live? `User.onboardingCompleted` flag exists -- is it used to skip the tour on returning users? (Worth grep-checking in T04.)

---

## §3. Generate

**Primary loop step:** Step 1.
**Surface(s):** `/generate` (main form), `/generations` (history), `/mashup`, `/compare`, `/inspire` (also feeds Discover §7).
**Components:** `GenerateForm` ✦ 44 (1421 LOC, 30 useState, 0 props), `GenerateTabs`, `GenerationProgress`, `GenerationQueue` (UNUSED -- imported by GenerateForm but never rendered? worth verifying in T03 dead-code-check), `BatchGeneratePanel`, `MashupStudio`, `RemixModal`, `CreateVariationModal`, `Confetti`.

### Steps

1. **Open `/generate`** -- `AppShell` nav-item "generate" (key #4 in `NAV_ITEMS`, prefetch:true). Loads `GenerateTabs` → `GenerateForm`.
2. **Choose mode** -- `GenerateTabs` (simple vs advanced via the `?tab=` URL param). 44 references to `generationMode/isAdvanced/preset/persona` inside `GenerateForm.tsx`.
3. **Fill 11 native form fields** (5 `<input>`, 3 `<select>`, 3 `<textarea>` per FRICTION-AUDIT §1) -- prompt, title, persona, preset, lyrics, style, duration, etc.
4. **Optional: load Persona / Preset** -- pulls in `useGenerateFormData` hook → autoFills fields. Persona-pick has side-effects on style/prompt cells.
5. **Optional: boost style or generate lyrics** -- 9 async handlers in the form (boostStylePrompt, generateLyricsFromPrompt, autoFillGenerationFields). Each is a Suno or OpenAI roundtrip.
6. **Optional: check credits** -- if `creditInfo.creditsRemaining <= 0`, `UpgradeModal` opens (1 owned modal in the form).
7. **Submit** -- POST `/api/generate`. SSE stream from `/api/generate/[jobId]/stream` drives `GenerationProgress`. Polling fallback via `useGenerationPoller` hook (in `useGenerateFormData`).
8. **Wait** -- progress bar shows up to a minute (Suno generates ~30-60s). User can leave the page; tracker is singleton (commit 868765f, visibility-aware SSE).
9. **Complete** -- song row updated via `/api/webhooks/suno` → SSE pushes done state → `Confetti` fires (first-generation only).
10. **Branch:** `/generations` to see history list, or click song → `/library/[id]` (jump to §6 Refine).

### Friction points (siehe M001-FRICTION-AUDIT §1)

- **30 useState in one component.** Mental-model overload while filling the form.
- **0 props on GenerateForm.** Composition-friendly redesign needs hook-routing, not prop-drilling -- DECISIONS-Kandidat fuer S03.
- **6 sibling components rendered inside the form** (`GenerationProgress`, `GenerationQueue` (UNUSED?), `BatchGeneratePanel`, `Confetti`, `UpgradeModal`, `InAppFeedbackWidget`). The form is a page-within-a-page.
- **11 native form widgets** without a shared `<FormField>` component (FRICTION-AUDIT §7.8). Design-system gap.
- **5 generation-cluster surfaces** (`/generate`, `/generations`, `/mashup`, `/compare`, `/inspire`) -- IA-Map (T04) must decide which are top-level vs. nested.

### Mobile-specific notes

- `GenerateForm.tsx` has only 10 tailwind breakpoint usages (MOBILE-AUDIT §A.2) -- form mostly stacks vertically, less responsive complexity.
- **No mobile-specific generate flow.** Same form, same fields. ExpandedPlayer pattern (Fullscreen mobile-only) could inspire a mobile-Advanced-Mode-Fullscreen for the form.

### Open IA questions for T04

- Where does `/inspire` belong: §3 Generate (it produces prompt seeds) or §7 Discover (it's a feed)?
- Where does `/mashup` belong: §3 Generate or a sub-page of `/generate`?
- Where does `/compare` belong: §3 Generate (it compares two outputs) or §6 Refine (it's used after generation)?
- `/generations` (history) is one URL away from `/generate` (form). Are they two pages or one with two tabs?
- `GenerationQueue` is imported by `GenerateForm` but flagged as 0 consumer in T02 reverse-grep -- is it dead, or wrapped in a conditional that grep missed? **Verify in T03.**

---

## §4. Listen

**Primary loop step:** Step 2.
**Surface(s):** `GlobalPlayer` (persistent in `AppShell` slot on every page), `ExpandedPlayer` (fullscreen, triggered from `GlobalPlayer:797`), `/library/[id]` (SongDetailView during playback), `/history`, `/songs`, `/library`.
**Components:** `GlobalPlayer` ✦ 40 (809 LOC, 7 useRef for race-guards), `QueueContext` ✦ 31 (847 LOC, 36 exposed values), `ExpandedPlayer` (7 commits), `PlayerWaveform` (6 commits), `StemsPlayer`, `AudioEQContext`, `EqualizerPanel`, `UpNextPanel`, `KeyboardShortcutsModal`.

### Steps

1. **Click play on any song** -- from LibraryView card, SongDetailView CTA, RecentlyPlayed rail, SongRecommendations. All paths call `useQueue().playQueue([song])` or `togglePlay()`.
2. **`GlobalPlayer` materialises at bottom** -- already mounted in `AppShell`, gets the `<audio>` element ready. `lib/audio-cdn.ts` issues signed URL via `/api/audio/[songId]` (16 commits, hot route).
3. **Track plays** -- `PlayEvent` row insert via `/api/songs/[id]/play`. `PlayHistory` row tracked. Streaks/recommendations/embeddings/analytics all feed from this.
4. **Waveform renders** -- peaks computed off-thread in `src/lib/audio/peaks-worker.ts` (commit 45023a6). `PlayerWaveform` shows progress + scrubbing.
5. **Optional: expand player** -- click cover/title in `GlobalPlayer` (line 122 `matchMedia("(min-width: 768px)")` check) → on desktop opens `ExpandedPlayer` modal; on mobile, fullscreen swipe-up sheet.
6. **Optional: queue management** -- `UpNextPanel` shows what's next. `QueueContext` exposes 14 ops (`playQueue`, `togglePlay`, `playNext`, `addToQueue`, `removeFromQueue`, `reorderQueue`, `skipNext/Prev`, `seek`, `toggleShuffle`, `cycleRepeat`, `clearQueue`, `setVolume`, `toggleMute`).
7. **Optional: lyrics karaoke** -- `LyricsPanel` (2 consumers) syncs to `currentTime` via `LyricTimestamp` rows.
8. **Optional: equalizer** -- `EqualizerPanel` operates on `AudioEQContext` state. Persisted via `eqSettingsRef` in QueueContext.
9. **Optional: radio mode** -- `useQueue().startRadio()` switches into mood-radio (algorithm in `MoodRadioView` + `/api/radio`). `radioState` in context.
10. **Persist state on close** -- `PlaybackState` model holds last-played song + position. Recovery via `use-playback-recovery.ts` hook on next mount.

### Friction points (siehe M001-FRICTION-AUDIT §5+§6)

- **`QueueContext` exposes 36 values.** Any consumer importing `useQueue()` gets the whole world; LibraryView destructures 8, SongDetailView likely more.
- **7 useRef in GlobalPlayer** for async-audio race-guards (load-generation token, peaks-worker, etc.). Unavoidable but constrains any redesign that affects the audio path.
- **GlobalPlayer has 32 tailwind breakpoint usages** (MOBILE-AUDIT §A.2, highest of any component) -- the persistent-bottom player must adapt heavily mobile↔desktop.
- **ExpandedPlayer trigger logic uses `matchMedia("(min-width: 768px)")` at click-time** (FRICTION-AUDIT §5, `GlobalPlayer.tsx:122`) -- runtime viewport branch, not pure CSS. Worth keeping as constraint.

### Mobile-specific notes

- **ExpandedPlayer is the mobile-primary fullscreen pattern** -- single trigger from GlobalPlayer. T02 noted "exactly one consumer per mobile primitive" pattern.
- **`PullToRefreshContainer`** appears in some listening surfaces (2 consumers per T02). Probably `RecentlyPlayed` + `/library`?
- **Long-press on `SongListItem`** (FRICTION-AUDIT-adjacent, MOBILE-AUDIT §B.1) opens selection / context menu -- worth keeping for mobile interaction depth.
- **Audio cache survives deploys** (MOBILE-AUDIT §C.2: `AUDIO_CACHE = "sunoflow-audio-v2"`). Listen continues offline once songs are explicitly saved.

### Open IA questions for T04

- Should `ExpandedPlayer` route to its own URL (`/now-playing`?) or stay modal-only? Currently modal-only.
- `QueueContext` exposes 36 values -- split-or-leave question is M002+ engineering, but the Journey doc should not assume a split.
- `MoodRadioView` lives at `/radio` (T01 surface) but radio state lives in `QueueContext`. Where is the canonical home for radio: §4 Listen or §7 Discover?

---

## §5. Organize

**Primary loop step:** Step 2.5 (between Listen and Refine -- library hygiene).
**Surface(s):** `/library`, `/library/[id]` (also serves §6 Refine), `/favorites`, `/playlists`, `/playlists/[id]`, `/playlists/invite/[token]`, `/songs` (alternate gallery), `/history`.
**Components:** `LibraryView` ✦ 71 (1507 LOC, 45 useState -- codebase max), `LibraryFilterPanel`, `LibraryToolbar`, `PlaylistsView`, `PlaylistDetailView` (18 commits), `PlaylistInviteView`, `SongsGalleryView`, `PlayHistoryView`, `HistoryView` (UNUSED per T02), `SongListItem`, `library/song-grid-card.tsx`, `library/swipable-song-row.tsx`, `AddToPlaylistButton` (4 consumers).

### Steps

1. **Open `/library`** -- `AppShell` nav-item #2 (`prefetch:true`). Loads `LibraryView` with `initialSongs` SSR'd.
2. **Apply filters** -- 12 distinct filter axes in `LibraryView`: searchText, status, rating, dateFrom/To, sortBy, tags[], smartFilter, genre[], mood[], tempoMin/Max, includeVariations. Plus `showFilters` boolean gates 9 of these behind a disclosure (already progressive!).
3. **Switch view mode** -- `viewMode` (4 mentions in code) -- grid vs list vs ?
4. **Select songs** -- 81 occurrences of "select" -- both filter-selection and per-song checkbox-selection share the keyword.
5. **Bulk-action selected songs** -- `LibraryBatchAction` via `runSongsBatchAction` (`lib/songs/library-client.ts`, commit abd5c5f). Actions: archive, delete, add-to-playlist, export.
6. **Per-song action** -- play (jumps to §4 Listen), favorite (toggles `Favorite` row + `/[locale]/favorites`), add-to-playlist (`AddToPlaylistButton`), open detail (`/library/[id]` → §6 Refine).
7. **Branch to playlists** -- `/playlists` list, `/playlists/[id]` for detail. `PlaylistDetailView` allows reorder, add collaborators, share, copy, publish.
8. **Branch to favorites** -- `/favorites` is a filter-on-library essentially (renders `LibraryView` with `favorites-only` flag).
9. **Branch to history** -- `/history` shows `PlayHistoryView`. `HistoryView` exists but is UNUSED top-level (T02 dead-code).
10. **Branch to /songs** -- `SongsGalleryView` is an alternate library surface. T01 flagged: two parallel library surfaces (`/library` vs `/songs`) without clear differentiation.

### Friction points (siehe M001-FRICTION-AUDIT §2)

- **45 useState in LibraryView** -- highest of any single component.
- **12 filter axes** -- 4 are "advanced" (gated by `showFilters`). The disclosure pattern works but is partial.
- **"select" overloaded** -- filter-select and selection-select share the word, both in code and UI.
- **0 occurrences of "bulk"** -- code uses "batch" instead. UX language vs. code language drift; T04 should pick a term.
- **`/songs` vs `/library` overlap** -- two top-level routes for "show me songs". T03 must decide single home.
- **`/discover/collections/[id]` URL is misleading** -- collections are Library-domain per FEATURE-MAP §2, but URL implies Discover.

### Mobile-specific notes

- `LibraryView.tsx` has 24 tailwind breakpoints + runtime `matchMedia("(pointer: coarse)")` (MOBILE-AUDIT §A.3, line 335) for mobile-only gesture path.
- `library/swipable-song-row.tsx` (1 consumer, MOBILE-AUDIT §B.3) -- swipe-row variant for mobile.
- `library/song-grid-card.tsx` -- canonical grid card for mobile.
- `useOfflineCache` is in LibraryView (per FRICTION-AUDIT §2). Per-song offline-toggle lives here.

### Open IA questions for T04

- `/songs` vs `/library`: keep both, merge, or rename one?
- `/discover/collections/[id]`: move to `/library/collections/[id]` (URL fix)?
- `/favorites` and `/history`: are they top-level or sub-pages of `/library`? Today they're top-level nav items (#13 and #14).
- Where does Smart-Playlist UI live? Currently inside `LibraryView` filter panel + `/api/smart-playlists`. No dedicated `/smart-playlists` page.

---

## §6. Refine

**Primary loop step:** Step 3.
**Surface(s):** `/library/[id]` (single canonical Refine page -- SongDetailView), plus 7 modals reachable from it.
**Components:** `SongDetailView` ✦ 57 (1527 LOC, 39 useState, 35 onClicks), `SongActionsBar` (sibling, 207 LOC, 10 buttons), `SongMetadataCard`, `SongLyricsSection`, `LyricsEditor`, `LyricsPanel`, `PlayerWaveform`, `RelatedSongs`, `SongRecommendations`, `ReactionTimeline`, `CommentsSection`. **Modals (7):** `SeparateVocalsModal`, `RemixModal` (dynamic), `EmbedCodeModal` (dynamic), `CreateVariationModal` (dynamic), `ReportModal` (dynamic), `CoverArtModal` (dynamic), plus inline "Save style" modal.

### Steps

1. **Open `/library/[id]`** -- from LibraryView click, SongRecommendations rail, ExpandedPlayer "view details", external `/s/[slug]` "open in app" CTA, etc.
2. **Identify the song** -- `SongMetadataCard` shows title/persona/duration/created-at. `CoverArtImage` (6 consumers) renders cover.
3. **Listen in context** -- in-page `PlayerWaveform` syncs with `GlobalPlayer` queue. Long songs scrub via waveform.
4. **Read / edit lyrics** -- `SongLyricsSection` displays. `LyricsEditor` (1 consumer presumably here) opens for edits. Karaoke-style `LyricsPanel` if `LyricTimestamp` rows exist.
5. **Per-song actions** (35 onClicks, 7 distinct modals):
   - Favorite / Rate / React (StarPicker + EmojiReactionPicker + ReactionTimeline)
   - Download (`DownloadButton` → `/api/songs/[id]/download` → optionally `/convert-wav` or `/generate-midi`)
   - Share → `ShareMenu` → `ShareButton` → public slug or `EmbedCodeModal`
   - Make variation → `CreateVariationModal` → `/api/songs/[id]/variations`
   - Remix → `RemixModal` → `/api/songs/[id]` derived flows
   - Generate cover art → `CoverArtModal` → `/api/songs/[id]/cover-art/generate`
   - Separate vocals → `SeparateVocalsModal` → `/api/songs/[id]/separate-vocals`
   - Extend / Add-instrumental / Add-vocals / Replace-section -- 4 routes under `/api/songs/[id]/*`, surfaced inside SongDetailView (UI exact location TBD)
   - Archive / Restore -- `/api/songs/[id]/archive` + `/restore`
   - Retry on failure -- `/api/songs/[id]/retry`
   - Report content -- `ReportModal`
   - Music-video generation -- `/api/songs/[id]/music-video` + `/status`
6. **Discover related** -- `RelatedSongs` (variant family + similar) + `SongRecommendations` rail at bottom.
7. **Comment / react** -- `CommentsSection` with `Comment` model, `EmojiReactionPicker`, timestamped.
8. **Loop back** -- click related song → repeat §6, or "Make variation" → spawn §3 Generate again.

### Friction points (siehe M001-FRICTION-AUDIT §3)

- **35 onClicks + 7 modals + 39 useState** in one component = **the page is a switchboard**.
- **Modal density is high** -- 6 of 7 modals dynamically imported (bundle-friendly), but the **action surface** is dense, not the bundle weight.
- **`SongActionsBar` siblings to SongDetailView** holds 10 of the 35 actions. The 25 remaining live in the parent -- partial extraction without clear seam.
- **Per-song API surface = 39 routes** under `/api/songs/[id]/*` (T01 §C). Every new per-song feature lands in this view.
- **39 features collapsed into one Refine page.** Progressive-disclosure case is direct twin of §3 Generate.

### Mobile-specific notes

- `SongDetailView.tsx` doesn't appear in MOBILE-AUDIT top-10 breakpoint files (only ~5 hits probably) -- mostly stacks vertically.
- **7 modals are *all* full-screen modals on mobile** -- no BottomSheet alternative used. T05 of S01 flagged BottomSheet has only 1 consumer (`PlaylistDetailView`). T04 could decide to migrate Modals → BottomSheet on mobile (out-of-scope for M001 redesign but worth flagging).

### Open IA questions for T04

- Should §6 Refine actions be re-grouped by category (Audio-edit / Visual-edit / Share / Trust)? Today's `SongActionsBar` is a flat list.
- Should "Variations" tree be its own surface (`/library/[id]/variations`)? Today inline in SongDetailView.
- Where does Music-Video output live -- inline modal, or dedicated route?
- 6 of 7 modals could be BottomSheet on mobile -- T04 should at least surface this as a possibility, even if S03+ implements.

---

## §7. Discover

**Primary loop step:** Secondary loop, feeds back to §3 Generate.
**Surface(s):** `/discover`, `/explore`, `/radio`, `/feed`, `/inspire`, `/discover/collections/[id]`, plus user-profiles `/users/[id]` and public `/u/[username]`.
**Components:** `DiscoverView` (shared by `/discover` AND `/explore` -- one component, two routes), `MoodRadioView` (`/radio`), `Feed` page (own implementation, doesn't reuse DiscoverView), `Inspire` page (own implementation), `CollectionDetailView`.

### Steps

1. **Pick which discover surface to use** -- this is the **first friction point**: 5 entries, no obvious differentiation:
   - `/discover` -- DiscoverView with default filter (top tracks?)
   - `/explore` -- DiscoverView with different filter ("explore" filter mode in same component)
   - `/radio` -- MoodRadioView: pick a mood, get auto-playing queue
   - `/feed` -- own page, presumably "what's new from people I follow"
   - `/inspire` -- own page, prompt-seed feed (also feeds §3 Generate)
2. **Browse** -- card-grid or list, songs by other users (public-flagged).
3. **Play** -- click song → §4 Listen flow.
4. **Open shared song page** -- jump to `/s/[slug]` (jump to §8 Share-receiving-end).
5. **Follow user** -- `FollowButton` → `/api/users/[id]/follow` → updates `/feed` future content.
6. **Discover a collection** -- `/discover/collections/[id]` opens `CollectionDetailView`. URL is Library-domain (`Collection` model), but URL says Discover (FEATURE-GAPS §A.5 + §D).

### Friction points

- **5 Discovery-Surfaces.** T01 flagged this as the canonical "ueberladen" sibling of GenerateForm. Two of them (`/discover`, `/explore`) literally share a component with different filter args. The other three (`/radio`, `/feed`, `/inspire`) are own surfaces.
- **`/inspire` is dual-citizen:** §3 Generate (prompt-seeds) and §7 Discover (browsing). T04 decision-point.
- **`/discover/collections/[id]`** URL is Library-domain misplaced under Discover (FEATURE-GAPS §A.5).
- `DiscoverView` has 20 breakpoint classes per MOBILE-AUDIT §A.2 -- responsive but no own friction quantification (not a god-object).
- **No clear narrative for "where do I look for inspiration":** new user sees 5 nav items in the Discover/Inspire/Radio/Feed/Explore cluster, has to learn the difference by trial.

### Mobile-specific notes

- All 5 surfaces work mobile, but the **5-item cluster eats 5 of the 17 nav slots** -- consolidation pressure is real on mobile-Drawer where every slot is a thumb-target.
- `MoodRadioView` and `DiscoverView` are card-grid heavy -- not BottomSheet candidates, but a "Discover" tab with 5 sub-modes would compress to 1 mobile slot.

### Open IA questions for T04

- **Single most important Discover decision:** merge `/discover` + `/explore` (already same component!) and decide if `/radio`/`/feed`/`/inspire` are sub-modes, separate, or relocated.
- Move `/discover/collections/[id]` to `/library/collections/[id]`?
- `/inspire` home: §3 Generate (prompt-seed feed) or §7 Discover (browsing)? Both are valid.
- `/users/[id]` (in-app) vs `/u/[username]` (public): why two profile surfaces? Auth-state differentiator, or accidental fork?

---

## §8. Share & Engage

**Primary loop step:** Step 4 (Share) + Engagement secondary loop.
**Surface(s):**
- **Share (Primary Step 4):** `/s/[slug]` (public song), `/p/[slug]` (public playlist), `/u/[username]` (public profile), `/embed/[songId]`, `/embed/playlist/[slug]`.
- **Engage (Secondary):** `/notifications`, `/stats`, `/insights`, `/analytics`, `/dashboard/analytics`, plus push (web-push), email (digest + weekly-highlights), RSS feeds.
**Components:** `PublicSongView` (37 commits, hot), `PublicPlaylistView`, `PublicProfileView`, `EmbedSongPlayer`, `EmbedPlaylistPlayer`, `NotificationsView`, `NotificationBell`, `NotificationContext`, `analytics/{Admin,Insights,Play,Stats,User}AnalyticsCharts` (5 charts, T02).

### Steps -- Share flow (Step 4)

1. **Decide to share** -- inside `/library/[id]` (§6 Refine), click Share (35-onClick density). Opens `ShareMenu`.
2. **Toggle public** -- `Song.isPublic` field; toggle via `/api/songs/[id]/share`. Until toggled, slug URL returns 404.
3. **Copy slug URL** -- `/s/[slug]` (Song), `/p/[slug]` (Playlist), `/u/[username]` (Profile). Slug is set on first publish, immutable.
4. **Optional embed** -- `EmbedCodeModal` generates iframe code pointing at `/embed/[songId]` or `/embed/playlist/[slug]`.
5. **Optional RSS** -- songs that match user's `RssFeedSubscription` get pushed to subscribers via `/api/rss/feeds/[id]`.
6. **Public consumption** -- `/s/[slug]` opens `PublicSongView` (37 commits). User without auth can play (`/api/audio/public/[songId]` MOBILE-AUDIT note). Auth-gated actions (favorite, comment, rate) prompt login.
7. **Receive engagement** -- comments, ratings, reactions, plays/views (`SongView` model) accumulate.

### Steps -- Engagement loop (returning user)

8. **Notification arrives** -- in-app (`NotificationBell` -> `NotificationsView`), web-push, OR email-digest.
9. **Notification opens `/notifications`** -- list of all notifications.
10. **User checks stats** -- `/stats` (basic user stats), `/insights` (deeper analysis), `/analytics` (top-level analytics), `/dashboard/analytics` (different analytics surface), `/dashboard/analytics/[songId]` (per-song analytics).
11. **User sees streak / milestone** -- `UserStreak` + `UserMilestone` driven by daily activity. Surfaced in `/stats` and via Notification.
12. **Loop back** -- user generates again (§3) or shares again (§8 Step 1).

### Friction points

- **5 Analytics-Surfaces** (`/analytics`, `/stats`, `/insights`, `/dashboard/analytics`, `/admin/analytics`) for one user-facing concept "see my data". COMPONENT-MAP confirms 5 chart files (`analytics/{Admin,Insights,Play,Stats,User}AnalyticsCharts.tsx`) mirroring the URL fragmentation 1:1.
- **2 profile surfaces** (`/users/[id]` in-app vs `/u/[username]` public). Why two? Auth-state? Accidental?
- **3 notification channels** (in-app, web-push, email) -- consolidated via `lib/notifications/channels.ts` seam (commit 699e819) after 0.2.0. Backend tidy, UI scattered.
- **Public surfaces are locale-free** (`/s/[slug]` not `/[locale]/s/[slug]`) per ROUTE-CATALOG §B. Sometimes inventory says otherwise (FEATURE-GAPS §A.5) -- watch.

### Mobile-specific notes

- `PublicSongView.tsx` has 14 breakpoint classes (MOBILE-AUDIT §A.2) -- well-adapted public-share surface.
- Embed widgets (`/embed/*`) are themselves mobile-rendered when consumed elsewhere (iframe-in-third-party).
- Push-notifications via `PushNotificationPrompt` (1 consumer, MOBILE-AUDIT §B.3) -- standalone PWA hook.
- Manifest gap: no `share_target` (MOBILE-AUDIT §C.1) -- the app cannot receive shares FROM other apps. Cheap UX win post-M001.

### Open IA questions for T04

- **Single most important Engage decision:** collapse 5 Analytics surfaces into 1-2. Options: tab-based `/analytics` with sub-views, OR keep `/analytics` and `/dashboard/analytics`, kill `/stats` + `/insights` as duplicates of those.
- `/users/[id]` vs `/u/[username]`: merge, or keep distinct purpose?
- Notifications hub: keep `/notifications` standalone, or absorb into `/stats`/`/dashboard`?
- Public surfaces (`/s/`, `/p/`, `/u/`, `/embed/*`) are URL-permalinks NOT internal nav -- T04 must mark them as "out of internal IA scope".

---

## §9. Coverage Matrix

Every Feature aus den S01-Outputs bekommt genau eine **Primary Home** (§2-§8) plus optionale **Secondary Entry Points**. Klassifikations-Regel: FEATURE-MAP §2 ist Source-of-Truth (per T01-Decision -- Inventory ist 19% gedriftet, vgl. FEATURE-GAPS §A).

Hartes Kriterium: kein Feature steht ausserhalb der Journey. Wer's nicht reinpasst -> Orphan (§9.4) oder Multi-Home-Decision (§9.5).

---

### §9.1 Pages Coverage (56 + 5 public)

Aus `M001-ROUTE-CATALOG.md` Section A (`[locale]/*`) und Section B (public).

#### §9.1.A Onboarding Home (§2)

| Page | Status | Notes |
|---|---|---|
| `/` (LandingPage) | live | Auch sekundaere Heimat von §3 (logged-in CTA → Generate) |
| `/[locale]/register` | live | Single-purpose |
| `/[locale]/login` | live | Single-purpose |
| `/[locale]/forgot-password` | live | Single-purpose |
| `/[locale]/reset-password` | live | Single-purpose |
| `/[locale]/verify-email` | live | Single-purpose |
| `/[locale]/profile` | live | API-Key-Wizard lebt hier -- T04 Q: dedicated onboarding-step? |

#### §9.1.B Generate Home (§3)

| Page | Status | Notes |
|---|---|---|
| `/[locale]/generate` | live | god-object GenerateForm hostet |
| `/[locale]/generations` | live | History-Liste, eng gekoppelt an /generate |
| `/[locale]/mashup` | live | Generate-Subform |
| `/[locale]/compare` | live | A/B-Compare zweier Generationen -- siehe §9.5 (Multi-Home zu §6 Refine) |
| `/[locale]/inspire` | live | **Multi-Home** -- siehe §9.5 |

#### §9.1.C Listen Home (§4)

| Page | Status | Notes |
|---|---|---|
| `/[locale]/history` | live | PlayHistoryView -- Listen-Loop-Wiederholung. **NICHT zu verwechseln mit `HistoryView` Component (dead)** |
| (GlobalPlayer + ExpandedPlayer haben keine eigene Route) | live | Persistent in AppShell-Slot |

#### §9.1.D Organize Home (§5)

| Page | Status | Notes |
|---|---|---|
| `/[locale]/library` | live | god-object LibraryView hostet |
| `/[locale]/library/[id]` | live | **Multi-Home** -- §9.5 (Listen via in-page Waveform + Refine via Action-Switchboard) |
| `/[locale]/songs` | live | **Multi-Home Konflikt zu /library** -- §9.5 |
| `/[locale]/favorites` | live | Filter-on-library (renders LibraryView mit favorites-only Flag) |
| `/[locale]/playlists` | live | Playlist-Index |
| `/[locale]/playlists/[id]` | live | PlaylistDetailView |
| `/[locale]/playlists/invite/[token]` | live | Collaborator-Invite |
| `/[locale]/discover/collections/[id]` | live | **URL-misplaced** -- gehoert zu Library; URL sagt Discover. §9.5 |

#### §9.1.E Refine Home (§6)

| Page | Status | Notes |
|---|---|---|
| `/[locale]/library/[id]` | live | (Cross-reference -- Page ist primaer §5 Organize, aber Refine-Aktivitaet lebt drin) |
| (alle 7 Modals leben innerhalb SongDetailView -- keine eigenen Routes) | live | -- |

#### §9.1.F Discover Home (§7)

| Page | Status | Notes |
|---|---|---|
| `/[locale]/discover` | live | DiscoverView mit "discover" filter |
| `/[locale]/explore` | live | DiscoverView mit "explore" filter -- **gleicher Component, zwei Routes**. Top Konsolidierungs-Kandidat. |
| `/[locale]/radio` | live | MoodRadioView -- **Multi-Home** zu §4 Listen (radioState lebt in QueueContext). §9.5 |
| `/[locale]/feed` | live | Activity feed |
| `/[locale]/inspire` | live | **Multi-Home** zu §3 Generate. §9.5 |
| `/[locale]/users/[id]` | live | In-App-Profile -- **Multi-Home** zu Public `/u/[username]`. §9.5 |

#### §9.1.G Share & Engage Home (§8)

| Page | Status | Notes |
|---|---|---|
| `/s/[slug]` (public, no locale) | live | PublicSongView (37 commits) |
| `/p/[slug]` (public, no locale) | live | PublicPlaylistView |
| `/u/[username]` (public, no locale) | live | PublicProfileView |
| `/embed/[songId]` (public) | live | EmbedSongPlayer |
| `/embed/playlist/[slug]` (public) | live | EmbedPlaylistPlayer |
| `/[locale]/notifications` | live | NotificationsView |
| `/[locale]/stats` | live | **Multi-Home Konflikt** zu /analytics + /insights + /dashboard/analytics. §9.5 |
| `/[locale]/insights` | live | Siehe oben |
| `/[locale]/analytics` | live | Siehe oben |
| `/[locale]/dashboard/analytics` | live | Siehe oben |
| `/[locale]/dashboard/analytics/[songId]` | live | Per-Song Analytics |

#### §9.1.H Out-of-Journey (Admin + Dev-Tools)

| Page | Status | Heimat | Notes |
|---|---|---|---|
| `/[locale]/admin` | live | §10 Admin (separate sub-app) | 12 admin pages, isolated. T04 Constraint: keep out of main IA. |
| `/[locale]/admin/users` | live | §10 | -- |
| `/[locale]/admin/users/[id]` | live | §10 | -- |
| `/[locale]/admin/reports` | live | §10 | -- |
| `/[locale]/admin/appeals` | live | §10 | -- |
| `/[locale]/admin/content` | live | §10 | -- |
| `/[locale]/admin/moderation` | live | §10 | -- |
| `/[locale]/admin/errors` | live | §10 | -- |
| `/[locale]/admin/logs` | live | §10 | -- |
| `/[locale]/admin/metrics` | live | §10 | -- |
| `/[locale]/admin/analytics` | live | §10 | -- |
| `/[locale]/admin/mirror` | live | §10 | DB-Mirror Health |
| `/[locale]/api-docs` | live | Dev-Tools | Swagger UI, session-gated; should be in user-menu, not main nav |
| `/[locale]/pricing` | live | **Cross-Cut** | Reachable from Onboarding (§2), Generate (§3 UpgradeModal), Settings (§8). Public + session-aware. |
| `/[locale]/settings` | live | Cross-Cut | Account-level settings; reachable from AppShell header |
| `/[locale]/settings/billing` | live | Cross-Cut | Sub-page of settings |

**Total Pages classified:** 51 `[locale]/*` + 5 public = 56 ✓

#### §9.1.I Authoring helpers Home (cross-cuts §3 Generate + §6 Refine)

| Page | Status | Notes |
|---|---|---|
| `/[locale]/personas` | live | Persona-Manager -- feeds §3 Generate `GenerateForm` persona-state |
| `/[locale]/templates` | live | Prompt-Templates -- feeds §3 Generate prompt-state |
| `/[locale]/style-templates` | live | Style-Templates -- feeds §3 Generate style-state |

3 separate Top-Level-Pages, alle FEATURE-MAP §6. **Konsolidierungs-Kandidat** -- siehe §9.5 (3 Routes, 3 Manager-Components, koennten ein `/authoring` Hub werden).

---

### §9.2 API Routes Coverage (224 routes)

Aus `M001-ROUTE-CATALOG.md` Section C. Gruppiert nach Mount-Prefix (eine Zeile pro Gruppe statt 224 einzelne).

| Mount group | Routes | Primary Home |
|---|---:|---|
| `/api/auth/*` | 7 | §2 Onboarding |
| `/api/account` `/api/register` `/api/onboarding/*` `/api/profile/*` | 13 | §2 Onboarding |
| `/api/billing/*` `/api/credits` | 9 | Cross-Cut (touches §2 Onboarding + §3 Generate + §8 Engage) |
| `/api/generate` `/api/generate/auto` `/api/generate/[jobId]/stream` | 3 | §3 Generate |
| `/api/generation-queue/*` `/api/generations` | 5 | §3 Generate |
| `/api/suno/*` (+circuit-breaker + import + status) | 4 | §3 Generate (3) + §10 Trust (circuit-breaker) |
| `/api/style-boost` `/api/lyrics/generate` `/api/mashup` | 3 | §3 Generate |
| `/api/songs/*` (root + actions + 39 per-id) | 50 | §5 Organize + §6 Refine (split by route -- read=§5, mutate-per-id=§6) |
| `/api/playlists/*` | 15 | §5 Organize |
| `/api/collections/*` | 2 | §5 Organize (despite `/discover/collections/[id]` URL) |
| `/api/tags/*` | 2 | §5 Organize |
| `/api/history` | 1 | §4 Listen |
| `/api/upload` | 1 | §3 Generate (audio upload variant) |
| `/api/export` | 1 | §5 Organize (data export) |
| `/api/audio/[songId]` `/api/audio/public/[songId]` | 2 | §4 Listen |
| `/api/images/[songId]` | 1 | §4 Listen (cover proxy) |
| `/api/user/playback-state` | 1 | §4 Listen |
| `/api/personas/*` `/api/prompt-templates/*` `/api/style-templates/*` `/api/prompts/*` `/api/presets/*` `/api/agent-skill` | 11 | §3 Generate (Authoring helpers feed Generate) |
| `/api/discover` `/api/feed` `/api/radio` `/api/feed-generations/*` | 6 | §7 Discover |
| `/api/u/[username]/*` `/api/users/*` `/api/ratings` `/api/feedback` `/api/error-report` | 13 | §7 Discover (profiles) + §8 Engage (ratings, feedback) |
| `/api/instagram/fetch` `/api/rss/*` `/api/digests/*` | 7 | §8 Engage (external surfaces + digest delivery) |
| `/api/notifications/*` `/api/push/*` `/api/streaks` `/api/milestones` `/api/email/*` `/api/events` `/api/insights` | 12 | §8 Engage |
| `/api/search` `/api/recommendations/*` `/api/smart-playlists` `/api/suggestions/*` | 7 | Cross-Cut: search/recs woven into §5 Organize + §7 Discover |
| `/api/admin/*` | 22 | §10 Admin (out-of-journey) |
| `/api/analytics/*` | 8 | §8 Engage (4 user-facing) + §10 Admin (1) |
| `/api/dashboard/*` | 2 | §8 Engage |
| `/api/cron/*` | 3 | §10 Trust/Ops |
| `/api/webhooks/*` | 2 | §3 Generate (Suno) + Cross-Cut (Stripe) |
| `/api/health` `/api/metrics` `/api/rate-limit/*` `/api/test/login` `/api/v1/openapi.json` `/api/docs` | 7 | §10 Trust/Ops |
| `/api/appeals` `/api/reports` | 2 | §10 Trust/Ops (user-facing) |
| `/api/settings` `/api/stats/user` | 2 | §2 Onboarding (settings) + §8 Engage (stats) |

**Total API routes classified:** 224 ✓ (Sum of groups = 224, matches T01 verification).

---

### §9.3 Components Coverage (101 + 6 subdirs)

Aus `M001-COMPONENT-MAP.md`. Pro god-object + Top-Level-by-churn + dead candidates.

#### §9.3.A god-objects (6, FEATURE-MAP §3)

| Component | Primary Home | Notes |
|---|---|---|
| `LibraryView` (71 commits) | §5 Organize | Touches §4 (queue), §5 (filter/sort), §6 (per-song actions) |
| `AppShell` (61 commits) | Cross-Cut (Shell, all journey-stations) | 17 nav-items wire to all §-stations |
| `SongDetailView` (57 commits) | §6 Refine | Also §4 listen via in-page waveform |
| `GenerateForm` (44 commits) | §3 Generate | Loop-Step-1 god-object |
| `GlobalPlayer` (40 commits) | §4 Listen | Persistent in AppShell-Slot |
| `QueueContext` (31 commits) | §4 Listen | 36 values exposed |

#### §9.3.B Notable per Loop (by section)

| Section | Components |
|---|---|
| §2 Onboarding | LandingPage, ApiKeyWizard, OnboardingTour, OnboardingTourUI, EmailVerificationBanner, Confetti, SessionProvider |
| §3 Generate | GenerateForm, GenerateTabs, GenerationProgress, BatchGeneratePanel, MashupStudio, RemixModal, CreateVariationModal, CoverArtModal, SunoStatusBanner, generate-form/* (4 helpers) |
| §3 (Authoring helpers, sub-cluster) | PersonaManager, StyleTemplateManager, TemplateBrowser, LyricsEditor, SectionEditor, TagInput |
| §4 Listen | GlobalPlayer, ExpandedPlayer, PlayerWaveform, StemsPlayer, AudioEQContext, EqualizerPanel, KeyboardShortcutsModal, QueueContext, UpNextPanel, queue/* (8 helpers), LyricsPanel |
| §5 Organize | LibraryView, LibraryFilterPanel, LibraryToolbar, SongsGalleryView, PlaylistsView, PlaylistDetailView, PlaylistInviteView, PlayHistoryView, AddToPlaylistButton, SongListItem, library/* (2), generation-history/retry-client |
| §6 Refine | SongDetailView, SongActionsBar, SongMetadataCard, SongLyricsSection, SongCompareView, SongRecommendations, RelatedSongs, CoverArtImage, DownloadButton, ShareButton, ShareMenu, EmbedCodeModal, SeparateVocalsModal, RecentlyPlayed |
| §7 Discover | DiscoverView (`/discover` + `/explore`), MoodRadioView, Feed (page) |
| §8 Share & Engage | PublicSongView, PublicPlaylistView, PublicProfileView, EmbedSongPlayer, EmbedPlaylistPlayer, NotificationsView, NotificationBell, NotificationContext, PushNotificationPrompt, ReactionTimeline, EmojiReactionPicker, StarPicker, FollowButton, ReportModal, FeedbackModal, InAppFeedbackWidget, CommentsSection, HighlightText, analytics/* (5 charts) |
| Cross-Cut | AppShell, AdminShell, ShellSkeleton, BottomSheet, OnboardingTour, LocaleSwitcher, OfflineIndicator, PwaInstallPrompt, ServiceWorkerRegistrar, RouteAnnouncer, SearchBar, Toast, Skeleton, ErrorBoundary, GlobalErrorHandler, ThemeProvider, QueryProvider, PostHogProvider, ClientOnlyComponents, FeatureGate, LowCreditsBanner, SubscriptionStatusBadge, UpgradeModal, PullToRefreshContainer |
| Trust/Admin | AdminShell |

**Total Components classified:** 101 (T02 confirmed) ✓

---

### §9.4 Orphans

Features die in keine §-Station passen. Pro Item: Begruendung + Vorschlag.

- **`DashboardView` Component (`src/components/DashboardView.tsx`, 11 commits, 0 consumers)** -- Ehemals Home-Surface, durch `LandingPage` ersetzt. Vorschlag: **delete** in M002+ (oder re-wire wenn jemand ihn doch verwenden will).
- **`HistoryView` Component (`src/components/HistoryView.tsx`, 11 commits, 0 consumers)** -- Ersetzt durch `PlayHistoryView` (`/history`). Vorschlag: **delete** in M002+.
- **`WaveformPlayer` Component (`src/components/WaveformPlayer.tsx`, 1 commit, 0 consumers)** -- Ersetzt durch `PlayerWaveform`. Vorschlag: **delete** in M002+.
- **`SunoImportModal` Component (`src/components/SunoImportModal.tsx`, 1 commit, 0 consumers)** -- Suno-Account-Import nie verkabelt. Inventory sagt "Built". Vorschlag: **re-wire** als `/api/suno/import` Surface in §3 Generate ODER **delete** wenn Feature gestrichen.
- **`/[locale]/api-docs`** -- Swagger UI fuer Power-User, session-gated. Hat kein Loop-Heimat. Vorschlag: **dedicated dev-menu** in Profile-Dropdown, nicht Main-Nav. NICHT in §2-§8.
- **`/[locale]/pricing`** -- Cross-Cut (Onboarding-Funnel + Generate-Upsell). Bleibt aussen-stehend, ist OK.
- **`/api/test/login`** -- E2E-Test-Helper, dev-only. Out-of-journey by design.
- **`/api/agent-skill`** -- Plugin-Metadata. Out-of-journey, infra.

Orphan-Count: **4 dead components + 4 out-of-journey routes** = 8 Orphans.

---

### §9.5 Multi-Home Features (Decisions for T04 IA-Map)

Features mit echtem Anspruch auf zwei oder mehr §-Stationen. Jeder Eintrag braucht eine T04-Decision.

1. **`/inspire`** -- Generate (Prompt-Seeds) + Discover (Browsing-Feed). **Default Decision:** Primary=§3 Generate, Secondary-Entry-Point in §7 Discover. Begruendung: der Loop "see prompts -> generate" fuehrt zurueck zu Generate, nicht zu Discover.

2. **`/compare`** -- Generate (A/B-Compare zweier neuer Generationen) + Refine (Compare-as-Refinement-Tool). **Default Decision:** Primary=§3 Generate (Generation-Cluster, sub-Tab in `/generate`), Secondary-Entry-Point in §6 Refine.

3. **`/discover` + `/explore`** -- gleicher Component DiscoverView, zwei Routes. **Default Decision:** merge zu einem `/discover` mit Tabs "Top" / "Explore". Niedrigst-haengende Konsolidierungs-Frucht.

4. **`/radio`** -- Discover (Browse-by-Mood) + Listen (radioState im QueueContext). **Default Decision:** Primary=§7 Discover, Secondary-Entry-Point in §4 Listen (player can switch into radio mode anywhere).

5. **`/songs` vs `/library`** -- zwei Library-Surfaces, unklare Trennung. **Default Decision:** kill `/songs`, alle Funktionalitaet in `/library`. SongsGalleryView wird `LibraryView` view-mode-option.

6. **`/discover/collections/[id]`** -- URL sagt Discover, Domain ist Library. **Default Decision:** URL-Fix nach `/library/collections/[id]`. Collections sind Library-Domain (FEATURE-MAP §2 + FEATURE-GAPS §D).

7. **`/users/[id]` vs `/u/[username]`** -- in-app vs public Profile. **Default Decision:** zwei Pages bleiben unterschiedlich (auth-state-different). Aber `/users/[id]` koennte sich umbenennen zu `/profile/[id]` fuer Klarheit.

8. **Analytics Cluster (5 surfaces):** `/analytics` `/stats` `/insights` `/dashboard/analytics` `/admin/analytics`. **Default Decision:** collapse zu 2 -- `/analytics` (user-facing mit Sub-Tabs Stats/Insights/Songs) + `/admin/analytics` (operator). Begruendung: 5 charts in `analytics/*` Subdir mirroren 1:1 die Routes, keine zwingende Trennung.

9. **Generate Cluster (5 surfaces):** `/generate` `/generations` `/mashup` `/compare` `/inspire`. **Default Decision:** `/generate` mit Tabs "Simple / Advanced / Mashup / Compare" + `/generations` als History-Sub-Route + `/inspire` getrennt als §3-Secondary §7-Primary.

10. **Authoring Helpers (3 surfaces):** `/personas` `/templates` `/style-templates`. **Default Decision:** ein `/authoring` Hub mit Tabs Personas/Prompts/Styles -- alle drei feed Generate, alle drei sind FEATURE-MAP §6.

11. **Authoring Helpers cross-cut §3 Generate + §6 Refine** -- Persona-Picks im GenerateForm vs. Persona-Management auf eigener Page. **Default Decision:** Management = `/authoring`; Auswahl bleibt inline in GenerateForm (Step 4 in §3).

12. **`/library/[id]` (SongDetailView page)** -- Multi-Home zu §4 Listen + §5 Organize + §6 Refine. **Default Decision:** Page-Primary=§6 Refine (das ist was hier passiert: refine the song). Listen ist Cross-Cut via GlobalPlayer; Organize ist via Back-to-Library Nav-Path.

**Total Multi-Home decisions:** 12, alle mit Default-Vorschlag. T04 wird formal entscheiden + in DECISIONS.md eintragen.

---

### §9.6 Coverage Audit

| Asset | Total | Classified | Outside Journey | Status |
|---|---:|---:|---:|---|
| Pages (`[locale]/*` + public) | 56 | 56 | 0 | ✅ alle in §2-§8 oder explizit Cross-Cut/Admin |
| API routes | 224 | 224 | 0 | ✅ alle Mount-Gruppen klassifiziert |
| Top-Components | 101 | 101 | 4 orphans (dead) | ✅ 97 live klassifiziert, 4 als Orphans flagged |
| Subdir-Cluster | 6 | 6 | 0 | ✅ analytics→§8, generate-form→§3, generation-history→§5, library→§5, queue→§4, ui→Cross-Cut |
| Bounded Contexts (FEATURE-MAP §2) | 10 | 10 | 0 | ✅ alle 10 mappen auf §-Stationen (Identity→§2, Billing→Cross-Cut, Generation→§3, Library→§5, Playback→§4, Authoring→§3+§6, Discovery→§7+§8, Engagement→§8, Search→§5+§7, Trust→§10/Cross-Cut) |
| Multi-Home Decisions | 12 | 12 | 0 | ✅ alle mit Default-Vorschlag fuer T04 |
| Orphans | 8 | 8 | -- | ✅ 4 dead components, 4 out-of-journey routes (api-docs, pricing, test/login, agent-skill) |

**Coverage Check: erfuellt.** Kein Feature aus den S01-Outputs steht ausserhalb der Journey. Alle 56 Pages, 224 API routes, 101 Components, 6 Subdir-Cluster, und 10 Bounded Contexts sind §2-§8 oder explizit als Cross-Cut/Admin/Orphan klassifiziert.

**Hartes Kriterium aus §1 Honesty-Acknowledgment: ✅ erfuellt.** Der App-Concept-Statement-Anspruch ("kein Feature outside the journey") haelt.

---

End of Coverage Matrix. Next: T04 IA-Konsolidierungs-Map (`M001-IA-MAP.md`) wird aus den 12 Multi-Home-Decisions die konkrete reduzierte Top-Level-Navigation ableiten.

---

## Reference notes

- All numeric findings here cross-reference `M001-FRICTION-AUDIT.md` (§1-§7) and `M001-ROUTE-CATALOG.md` (Sections A-D).
- Persona statement is grounded in the 10 FEATURE-MAP §2 contexts plus T04 friction numbers; it is not a marketing persona but a behavioral type derived from what the code makes easy.
- "Suno power-user" is a coined description for this doc -- no formal user-research persona exists.

End of §1 (T01 output). T02 will populate §2-§8; T03 will populate §9.

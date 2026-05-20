---
milestone: M001
slice: S01
task: T02
artifact: COMPONENT-MAP
created: 2026-05-18T07:20:00Z
sources:
  - find src/components -maxdepth 1 -name '*.tsx' (101 top-level files, excl. tests)
  - 6 subdirs (analytics, generate-form, generation-history, library, queue, ui)
  - git log --since=2026-01-01 per component (commit churn)
  - grep -rlE '[\"\\\\']`[^\"\\\\']*/${name}[\"\\\\']` src/app src/components (reverse-lookup)
  - .ytstack/FEATURE-MAP.md §3 (hot files)
  - .ytstack/M001-ROUTE-CATALOG.md (cross-ref)
totals:
  top_level_components: 101
  subdirs: 6
  dead_components: 4
  hot_files_ge_20_commits: 6
---

# M001 Component Map

Pure inventory. Roles inferred from filename; consumer counts and churn from grep/git log. No interpretation -- consolidation work happens in S02/S03.

Columns:
- **Component** -- filename (without `.tsx`)
- **Role** -- one-sentence inferred function
- **Consumers** -- `# of files outside this component importing it (matches "*/<Name>")
- **Hot** -- commits since 2026-01-01 (✦ = ≥20, the FEATURE-MAP §3 god-objects)

---

## A. Top-level components by domain (101)

### Shell & Navigation (12)

| Component | Role | Consumers | Hot |
|---|---|---|---|
| `AppShell` | Primary layout: sidebar nav + header + GlobalPlayer slot. 17 nav items. | 25 | ✦ 61 |
| `AdminShell` | Admin-only layout wrapper (sub-nav for `/admin/*` pages). | 1 | 10 |
| `ShellSkeleton` | Loading shell placeholder. | 8 | 2 |
| `BottomSheet` | Mobile slide-up sheet primitive (used by PlaylistDetailView). | 1 | 2 |
| `OnboardingTour` | Multi-step product tour controller. | 3 | 11 |
| `OnboardingTourUI` | Tour step renderer / overlay. | 1 | 0 |
| `LocaleSwitcher` | Language dropdown in header. | 1 | 2 |
| `OfflineIndicator` | Banner when PWA goes offline. | 1 | 1 |
| `PwaInstallPrompt` | "Add to home screen" CTA. | 1 | 2 |
| `ServiceWorkerRegistrar` | Registers `/sw.js?v=<sha>` (per-deploy cache busting). | 1 | 3 |
| `RouteAnnouncer` | A11y route-change announcer. | 1 | 1 |
| `SearchBar` | Top-level search input + suggestion popover. | 1 | 7 |

### Auth & Identity (3)

| Component | Role | Consumers | Hot |
|---|---|---|---|
| `EmailVerificationBanner` | "Please verify your email" banner. | 1 | 4 |
| `SessionProvider` | Wraps NextAuth `SessionProvider` for client tree. | 1 | 11 |
| `ApiKeyWizard` | API-key generation flow (profile page). | 1 | 6 |

### Player & Playback (10)

| Component | Role | Consumers | Hot |
|---|---|---|---|
| `GlobalPlayer` | Persistent bottom-of-screen player. Audio element + controls + queue. | 1 (AppShell, dynamic) | ✦ 40 |
| `ExpandedPlayer` | Fullscreen player view (mobile + tap-up on desktop). | 1 | 7 |
| `PlayerWaveform` | Waveform-progress strip inside GlobalPlayer. | 3 | 6 |
| `WaveformPlayer` | Standalone waveform-player surface (UNUSED currently). | **0** | 1 |
| `StemsPlayer` | Multi-track stem mixer view. | 1 | 1 |
| `AudioEQContext` | EQ state provider (gains + presets). | 2 | 1 |
| `EqualizerPanel` | EQ control UI (slot in ExpandedPlayer). | 2 | 0 |
| `KeyboardShortcutsModal` | "?" overlay listing shortcuts. | 1 | 1 |
| `QueueContext` | Playback queue + shuffle/repeat + persisted state. | 17 | ✦ 31 |
| `UpNextPanel` | Queue preview drawer. | 1 | 0 |

### Generation (11)

| Component | Role | Consumers | Hot |
|---|---|---|---|
| `GenerateForm` | The main generation form. Persona/preset/prompt/style/title/duration/etc. | 2 | ✦ 44 |
| `GenerateTabs` | Tab switcher: simple vs advanced generation modes. | 1 | 4 |
| `GenerationProgress` | Pending/in-flight job progress bar (in form + history). | 3 | 4 |
| `GenerationQueue` | Queued-jobs list with reorder + cancel (UNUSED at top-level). | **0** | 0 |
| `GenerationHistoryView` | List of past generations (`/generations`). | 1 | 5 |
| `BatchGeneratePanel` | Bulk-generate UI (multiple prompts at once). | 1 | 1 |
| `MashupStudio` | Mashup-of-two-songs surface (`/mashup`). | 1 | 3 |
| `SunoImportModal` | Import existing Suno-account songs (UNUSED). | **0** | 1 |
| `SunoStatusBanner` | "Suno API degraded" banner. | 1 | 1 |
| `RemixModal` | Remix-this-song dialog. | 1 | 1 |
| `CreateVariationModal` | "Make another version" dialog (variants). | 1 | 2 |

### Library & Songs (24)

| Component | Role | Consumers | Hot |
|---|---|---|---|
| `LibraryView` | Main library grid + filter + sort + bulk-ops. | 2 | ✦ 71 |
| `LibraryFilterPanel` | Filter sidebar (genre/mood/tag/status). | 1 | 1 |
| `LibraryToolbar` | Top toolbar inside LibraryView (sort, view mode, selection). | 1 | 4 |
| `SongsGalleryView` | Alternate gallery view (`/songs`). | 1 | 12 |
| `SongDetailView` | Per-song page surface (`/library/[id]`). | 1 | ✦ 57 |
| `SongListItem` | Single song row used in lists. | 2 | 7 |
| `SongActionsBar` | Action buttons under a song (play/like/share/download/...). | 1 | 4 |
| `SongMetadataCard` | Title/persona/duration/created-at card. | 1 | 1 |
| `SongLyricsSection` | Lyrics panel inside SongDetailView. | 1 | 1 |
| `SongCompareView` | A/B compare two variants (`/compare`). | 1 | 1 |
| `SongRecommendations` | "You might also like" rail. | 1 | 1 |
| `RelatedSongs` | Variant-family + similar songs. | 1 | 2 |
| `RecentlyPlayed` | Home-page rail of recent plays. | 1 | 4 |
| `HistoryView` | Play-history surface (UNUSED at top-level -- see PlayHistoryView). | **0** | 11 |
| `PlayHistoryView` | The active /history surface. | 1 | 0 |
| `AddToPlaylistButton` | "+ Playlist" menu. | 4 | 2 |
| `DownloadButton` | Download-MP3/WAV button. | 1 | 1 |
| `ShareButton` | Share trigger (opens ShareMenu). | 1 | 1 |
| `ShareMenu` | Share-to-X / copy-link menu. | 3 | 1 |
| `EmbedCodeModal` | Embed-iframe code dialog. | 1 | 1 |
| `SeparateVocalsModal` | Vocals/instrumental separation dialog. | 1 | 1 |
| `CoverArtImage` | Cover-art with skeleton + fallback. | 6 | 6 |
| `CoverArtModal` | Generate/upload cover art dialog. | 1 | 1 |
| `DashboardView` | Old home dashboard (UNUSED -- replaced by LandingPage?). | **0** | 11 |

### Playlists (4)

| Component | Role | Consumers | Hot |
|---|---|---|---|
| `PlaylistDetailView` | Playlist page (`/playlists/[id]`). | 1 | 18 |
| `PlaylistInviteView` | Collaborator-invite acceptance page. | 1 | 1 |
| `PlaylistsView` | Playlists index page. | 1 | 9 |
| `SwipeablePlaylistItem` | Swipe-to-delete playlist row. | 1 | 1 |

### Authoring helpers (7)

| Component | Role | Consumers | Hot |
|---|---|---|---|
| `PersonaManager` | Personas CRUD UI (`/personas`). | 1 | 5 |
| `StyleTemplateManager` | Style-templates CRUD UI (`/style-templates`). | 1 | 2 |
| `TemplateBrowser` | Prompt-templates picker (`/templates`). | 1 | 4 |
| `LyricsEditor` | Lyrics-edit textarea + timestamp tools. | 1 | 1 |
| `LyricsPanel` | Display-only lyrics panel (with sync). | 2 | 3 |
| `SectionEditor` | Verse/chorus/bridge section editor. | 1 | 1 |
| `TagInput` | Pill-style tag input. | 1 | 1 |

### Discovery & social (10)

| Component | Role | Consumers | Hot |
|---|---|---|---|
| `MoodRadioView` | Mood-radio surface (`/radio`). | 1 | 3 |
| `CommentsSection` | Threaded comments under a song. | 1 | 2 |
| `EmojiReactionPicker` | Emoji-reaction popover. | 2 | 1 |
| `ReactionTimeline` | Inline emoji-reactions on waveform. | 3 | 1 |
| `FollowButton` | Follow/unfollow user. | 2 | 2 |
| `StarPicker` | 5-star rating widget. | 1 | 1 |
| `FeedbackModal` | "How are we doing?" modal. | 1 | 1 |
| `InAppFeedbackWidget` | Floating feedback bubble. | 1 | 2 |
| `ReportModal` | Report-content modal. | 3 | 1 |
| `HighlightText` | Search-result text-highlighter. | 1 | 1 |

### Engagement (10)

| Component | Role | Consumers | Hot |
|---|---|---|---|
| `NotificationsView` | `/notifications` list. | 1 | 1 |
| `NotificationBell` | Header bell icon with unread-badge. | 1 | 8 |
| `NotificationContext` | Notification state provider + toasts. | 4 | 8 |
| `PushNotificationPrompt` | "Enable push?" CTA. | 1 | 1 |
| `LowCreditsBanner` | Banner when credits running low. | 1 | 1 |
| `SubscriptionStatusBadge` | "Free/Pro" badge in header. | 1 | 1 |
| `UpgradeModal` | Upgrade-to-paid modal. | 1 | 1 |
| `FeatureGate` (+`InlineFeatureGate`) | Tier-gated wrapper components. | 2 | 2 |
| `PullToRefreshContainer` | Mobile pull-to-refresh. | 2 | 1 |
| `Confetti` | Success burst overlay. | 1 | 1 |

### Home (1)

| Component | Role | Consumers | Hot |
|---|---|---|---|
| `LandingPage` | Marketing landing surface (`/`). | 1 | 4 |

### Infra & util (9)

| Component | Role | Consumers | Hot |
|---|---|---|---|
| `Toast` (+`ToastProvider`) | Toast notification primitive. | 31 | 5 |
| `Skeleton` (+`SkeletonText`) | Loading-shimmer primitive. | 21 | 5 |
| `ErrorBoundary` | React error boundary. | 2 | 2 |
| `GlobalErrorHandler` | Window-level error capture → GlitchTip. | 2 | 6 |
| `ThemeProvider` | Dark/light theme context. | 3 | 1 |
| `QueryProvider` | TanStack Query provider. | 1 | 1 |
| `PostHogProvider` | Deferred PostHog init (idle-callback). | 1 | 3 |
| `ClientOnlyComponents` | SSR-safe client-only wrapper. | 1 | 1 |
| `RouteAnnouncer` | (already counted in Shell) | -- | -- |

---

## B. Hot files (FEATURE-MAP §3 + churn-since-2026-01-01 top-25)

| # | Component | Commits | Note |
|---|---|---|---|
| 1 | `LibraryView` | 71 | FEATURE-MAP god-object: filter + sort + selection + bulk-ops + virtualised grid |
| 2 | `AppShell` | 61 | Layout + 17 nav items + GlobalPlayer slot + auth state |
| 3 | `SongDetailView` | 57 | Every per-song feature lands here |
| 4 | `GenerateForm` | 44 | Mirror of `/api/generate/route.ts` (also 42 commits) |
| 5 | `GlobalPlayer` | 40 | Async audio + queue + waveform + race-condition fixes |
| 6 | `QueueContext` | 31 | Queue state, shuffle/repeat, persisted player state |
| 7 | `PlaylistDetailView` | 18 | Collaborators + reorder + share + bulk add |
| 8 | `SongsGalleryView` | 12 | Alternate library surface |
| 9 | `DashboardView` | 11 | **UNUSED today** -- carries history, no consumer |
| 10 | `HistoryView` | 11 | **UNUSED today** -- consumer migrated to `PlayHistoryView` |
| 11 | `OnboardingTour` | 11 | Tour controller |
| 12 | `SessionProvider` | 11 | NextAuth wrapper |
| 13 | `AdminShell` | 10 | Admin layout |
| 14 | `PlaylistsView` | 9 | Index of playlists |
| 15 | `NotificationContext` | 8 | Channel-config seam |
| 16 | `NotificationBell` | 8 | Unread badge |
| 17 | `SongListItem` | 7 | Single-song row (was poll-based, now subscription-based after 0.2.0) |
| 18 | `SearchBar` | 7 | Header search |
| 19 | `ExpandedPlayer` | 7 | Fullscreen player |
| 20 | `PlayerWaveform` | 6 | Waveform strip |
| 21 | `GlobalErrorHandler` | 6 | Sentry/GlitchTip capture |
| 22 | `CoverArtImage` | 6 | Art with fallback |
| 23 | `ApiKeyWizard` | 6 | API-key flow |
| 24 | `Toast` | 5 | Toast primitive (high churn for a primitive -- watch) |
| 25 | `Skeleton` | 5 | Skeleton primitive |

Six god-objects exceed 30 commits (`LibraryView`, `AppShell`, `SongDetailView`, `GenerateForm`, `GlobalPlayer`, `QueueContext`). Matches FEATURE-MAP §3 prediction.

---

## C. Subdirs under `src/components/<dir>/` (6)

### `src/components/analytics/` (5 .tsx files)

Chart-only components, consumed by the analytics surfaces (`/analytics`, `/dashboard/analytics`, `/admin/analytics`, `/stats`, `/insights`).

| File | Likely consumer |
|---|---|
| `AdminAnalyticsCharts.tsx` | `/admin/analytics` |
| `InsightsCharts.tsx` | `/insights` |
| `PlayAnalyticsCharts.tsx` | `/dashboard/analytics/[songId]` |
| `StatsCharts.tsx` | `/stats` |
| `UserAnalyticsCharts.tsx` | `/analytics` |

Observation for S02: each Analytics surface has its own chart bundle. Consolidation candidate (one parameterised `AnalyticsCharts` with a "mode" prop) -- not a UX decision, just a code-shape observation.

### `src/components/generate-form/` (0 .tsx + 4 .ts + 1 .test.ts)

Helper modules consumed by `GenerateForm.tsx`. Not standalone components.

| File | Role |
|---|---|
| `api.ts` | tRPC-ish API calls from the form |
| `helpers.ts` (+ `helpers.test.ts`) | Pure helpers (prompt-trimming, etc.) |
| `types.ts` | Form-state TS types |
| `useGenerateFormData.ts` | Data-loading hook |

### `src/components/generation-history/` (0 .tsx + 1 .ts + 1 .test.ts)

| File | Role |
|---|---|
| `retry-client.ts` (+ test) | Extracted retry-transport helpers (commit d424236) |

### `src/components/library/` (2 .tsx)

| File | Role |
|---|---|
| `song-grid-card.tsx` | Single grid-card variant inside LibraryView |
| `swipable-song-row.tsx` | Mobile swipe-to-action row inside LibraryView |

### `src/components/queue/` (0 .tsx + 7 .ts + 4 .test.ts)

Playback/queue state helpers consumed by `QueueContext.tsx`. Not standalone components.

| File | Role |
|---|---|
| `playback-state.ts` (+ test) | Persisted state shape |
| `queue-context-types.ts` | TS types |
| `queue-ops.ts` (+ test) | Add/remove/reorder ops |
| `radio-ops.ts` (+ test) | Mood-radio queue ops |
| `use-media-session.ts` | Browser Media Session API binding |
| `use-playback-recovery.ts` | Recover state on reload |
| `use-playback-sync.ts` | Cross-tab sync |
| `use-playback-tracking.ts` | PostHog event tracking |

### `src/components/ui/` (1 .tsx)

| File | Role |
|---|---|
| `drawer.tsx` | Generic side-drawer primitive |

---

## D. Dead-code candidates (4 fully unused top-level components)

Each has **0** matches in `src/app/**` or `src/components/**` for the import pattern `[\"'][^\"']*/<Name>[\"']`, AND **0** raw word-boundary references across `*.tsx`/`*.ts`. Verified via:

```bash
grep -rE "\\b<Name>\\b" src/app src/components --include="*.tsx" --include="*.ts" | grep -v "components/<Name>.tsx"
```

| Component | Last commit churn (since 2026-01-01) | Note |
|---|---|---|
| `DashboardView` | 11 commits | High churn, then orphaned. Was the old home-page surface? `LandingPage` now occupies `/`. |
| `HistoryView` | 11 commits | Replaced by `PlayHistoryView` (which has 0 churn but is the live consumer). |
| `WaveformPlayer` | 1 commit | Older waveform surface, replaced by `PlayerWaveform` inside `GlobalPlayer`. |
| `SunoImportModal` | 1 commit | Suno-account import flow, possibly never wired into a page. |

S02 decision-point: keep / delete / re-wire. Not deciding here.

---

## E. Observations (for S02)

1. **6 god-objects** (`LibraryView`, `AppShell`, `SongDetailView`, `GenerateForm`, `GlobalPlayer`, `QueueContext`) absorb the majority of churn. Any IA-Map decision must respect that splitting them is its own engineering project, not a cheap nav-redesign side effect.
2. **`AppShell.tsx` is the single arbiter of the 17-item nav.** All nav-consolidation lands in one file -- low blast-radius for a navigation redesign.
3. **`SongDetailView` is THE per-song actions hub.** 57 commits, 1 consumer (`/library/[id]`). Generate-View overload pattern (T04 concern) has a sibling here -- expect a similar progressive-disclosure case for per-song actions in M002+.
4. **Analytics chart components are split into 5 surfaces** (mirrors the 4 analytics pages observed in T01). Same consolidation pressure on UI level as on URL level.
5. **Authoring helpers each have their own top-level manager** (`PersonaManager` / `StyleTemplateManager` / `TemplateBrowser`). Same pattern as the 3 separate `/personas` `/templates` `/style-templates` routes -- consolidation candidate is consistent across URL + component layers.
6. **`Toast` has 31 consumers** but only 5 commits -- well-factored primitive. Same for `Skeleton` (21 consumers, 5 commits). These are healthy abstractions.
7. **`SongListItem` is the canonical list row** (2 consumers but referenced from `LibraryView` + `RecentlyPlayed` + `PlaylistDetailView`). Worth checking in S02 that any new list surface re-uses it instead of forking.
8. **`BottomSheet` only has 1 consumer (`PlaylistDetailView`).** Mobile pattern available, under-utilised -- relevant for T05 mobile audit.
9. **`OnboardingTour` + `OnboardingTourUI` are split.** Tour state + tour UI separated, but both top-level. Probably fine.
10. **Subdir cluster discipline is good** -- `queue/` and `generate-form/` extract logic to `.ts` files cleanly. The pattern works; do not invent a parallel one for M002+ work.

---

End of map.

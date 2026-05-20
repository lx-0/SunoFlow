---
milestone: M001
slice: S01
task: T03
artifact: FEATURE-GAPS
created: 2026-05-18T07:35:00Z
sources:
  - .ytstack/FEATURE-MAP.md §2 (10 Bounded Contexts)
  - docs/feature-inventory.md (manual inventory, last updated 2026-04-22)
  - .ytstack/M001-ROUTE-CATALOG.md (T01)
  - .ytstack/M001-COMPONENT-MAP.md (T02)
  - prisma/schema.prisma (51 models, sampled)
---

# M001 Feature Gaps

Dreiseitiger Abgleich: `docs/feature-inventory.md` (manuell, 2026-04-22) vs. `FEATURE-MAP.md §2` (Code-Read 2026-05-15) vs. T01-ROUTE-CATALOG + T02-COMPONENT-MAP. Inventur, keine Empfehlungen.

---

## A. Inventory claimed something that is missing / has moved (drift)

### A.1 Lib-Files migriert zu Subdirs (Inventory veraltet)

Zwischen 2026-04-22 (inventory last-updated) und 2026-05-18 wurden 11 single-file libs auf Subdir-Module umgestellt. Inventory zeigt noch die alten Pfade.

| Inventory claim | Actual location |
|---|---|
| `src/lib/auth.ts` | `src/lib/auth/` (subdir, incl. `admin.ts`, `index.ts`) |
| `src/lib/billing.ts` | `src/lib/billing/` (incl. `checkout.ts`) |
| `src/lib/credits.ts` | `src/lib/credits/` |
| `src/lib/digest.ts` | `src/lib/digest/` |
| `src/lib/email.ts` | `src/lib/email/` |
| `src/lib/embeddings.ts` | `src/lib/embeddings/` |
| `src/lib/rate-limit.ts` | `src/lib/rate-limit/` (with `sliding-window/` per FEATURE-MAP §5) |
| `src/lib/rss.ts` | `src/lib/rss/` |
| `src/lib/streaks.ts` | `src/lib/streaks/` (incl. `milestones.ts`) |
| `src/lib/activity.ts` | `src/lib/activity/` |
| `src/lib/smart-playlists.ts` | `src/lib/smart-playlists/` |

### A.2 Lib-Files / Routes weg ohne Ersatz-Pointer

| Inventory claim | Status |
|---|---|
| `src/lib/admin-auth.ts` | **gone** -- function now `src/lib/auth/admin.ts` |
| `src/lib/api-keys.ts` | **gone** -- API at `/api/profile/api-keys`, lib distributed |
| `src/lib/api-key-auth.ts` | **gone** -- FEATURE-MAP §5 also still references it (stale) |
| `src/lib/audio-cache.ts` | **gone** -- no equivalent file found |
| `src/lib/offline-cache.ts` | **gone** -- no equivalent file found |
| `src/lib/variants-family.ts` | **moved/renamed** -- now `src/lib/songs/variations/` |
| `src/app/api/checkout` | **wrong path** -- actual: `src/app/api/billing/checkout` |

### A.3 Inventory zaehlt 47 Models, schema hat 51

`docs/feature-inventory.md` (Zeile 227-229) zaehlt 47 Modelle. `grep -cE "^model " prisma/schema.prisma` ergibt **51**. Differenz: 4 Modelle. Inventory-Liste ist auf alphabetischer Ebene nicht vollstaendig -- konkrete Fehler nicht ausgezaehlt, aber Diskrepanz signalisiert dass die Liste seit mind. April nicht aktualisiert wurde.

### A.4 Components als "Built" markiert, aber im Code tot (T02 verified)

| Inventory claim | Reality |
|---|---|
| "Waveform visualization: `src/components/WaveformPlayer.tsx`" | **WaveformPlayer ist UNUSED** (0 imports). Live: `PlayerWaveform`. |
| "Import from Suno: `src/components/SunoImportModal.tsx`" | **SunoImportModal ist UNUSED** (0 imports). Feature nie verkabelt? |
| (nicht im inventory) `DashboardView` | UNUSED -- ehemaliger Home-Surface, durch `LandingPage` ersetzt |
| (nicht im inventory) `HistoryView` | UNUSED -- ersetzt durch `PlayHistoryView` (`/[locale]/history`) |

### A.5 Pfad-Ungenauigkeiten

| Inventory claim | Reality |
|---|---|
| "Lyrics editor: `src/components/LyricsEditor.tsx`" | exists, aber 0 consumer-route -- moeglicherweise nur intern in `SongDetailView` |
| "Public share URLs: `src/app/[locale]/s/[slug]`" | actual: `src/app/s/[slug]` (kein `[locale]` -- public surfaces sind locale-frei, siehe T01 Section B) |
| "Public share URLs: `src/app/[locale]/p/[slug]`" | actual: `src/app/p/[slug]` |
| "Public user profiles: `src/app/[locale]/u/[username]`" | actual: `src/app/u/[username]` |
| "Embeddable: `src/app/[locale]/embed/*`" | actual: `src/app/embed/*` |

---

## B. Code has Features that Inventory doesn't document

### B.1 Pages / Routes ohne Inventory-Eintrag

**Top-level Pages:**
- `/[locale]/songs` (`SongsGalleryView`) -- alternate library surface, Inventory hat nur "Song library (list/grid)" auf `/library`. Zwei parallele Library-Surfaces ohne Erklaerung.
- `/[locale]/history` (`PlayHistoryView`) -- Inventory hat "Play history tracking" als Model, aber nicht die Page.
- `/[locale]/stats` -- Inventory hat "Analytics" Sektion mit `/analytics` + `/dashboard/analytics`, aber nicht `/stats` (ist 4. Analytics-Surface, siehe T01).

**Admin pages:**
- `/[locale]/admin/mirror` -- DB-mirror health (`/api/admin/mirror-health` route exists).

**API routes (~50 unsourced, kondensiert):**
- Pro-Song Aktionen ohne Inventory: `/api/songs/[id]/extend`, `/retry`, `/replace-section`, `/separate-vocals`, `/convert-wav`, `/generate-midi`, `/music-video` (+`/status`), `/stems`, `/add-vocals`, `/add-instrumental`, `/restore`, `/playable-versions`, `/similar`, `/also-liked`, `/related`, `/feedback`, `/feedback/summary`.
- Batch / Trending / Discovery: `/api/songs/batch-generate`, `/batch`, `/batch-status`, `/trending`, `/genres`, `/moods`, `/discover`.
- Playlists-Verben: `/api/playlists/discover`, `/api/playlists/[id]/copy`, `/share`, `/activity`, `/publish`, `/collaborative`, `/reorder`.
- Feed-Generation: `/api/feed-generations`, `/feed-generations/[id]`, `/feed-generations/[id]/approve` (3 Routen + Approval-Workflow, Inventory hat nur "RSS feed integration").
- User: `/api/u/[username]/liked-songs`, `/milestones`, `/playlists`, `/songs`, plus `/api/users/[id]/follow`, `/me/export`, `/me/following`.
- Suggestions / Recommendations Detail: `/api/recommendations/daily`, `/api/recommendations/similar`, `/api/suggestions/prompts`, `/api/suggestions/trending`.
- Admin: `/api/admin/mirror-health`, `/sentry-test`, `/backfill-images`, `/feedback`, `/users/[id]/credits`, `/users/[id]/history`, `/users/[id]/plan`, `/users/[id]/toggle`.
- Email: `/api/email/unsubscribe`, `/api/email/weekly-highlights`.
- OpenAPI: `/api/v1/openapi.json` (separat von `/api/docs`).
- Plugin: `/api/agent-skill` (Plugin-metadata).
- OG: `/api/og/song/[songId]/route.tsx` (actual path -- Inventory sagt nur "`/api/og`").

### B.2 Lib-Module ohne Inventory-Eintrag (Architektur-Seams seit 0.2.0)

Diese 0.2.0-Refactors (commits `687de28`, `f5d8aa9`, `c598c87`, `f86b468`, `76f7fb3`, `699e819`, `d870af1`) haben neue Seams produziert, Inventory noch nicht aktualisiert:

| Path | Rolle |
|---|---|
| `src/lib/songs/lifecycle.ts` | Single seam fuer generationStatus + archivedAt transitions |
| `src/lib/songs/stale-pending-recovery.ts` | Recovery von stuck-pending songs |
| `src/lib/songs/library-client.ts` | Centralized playlist/batch API calls (commit abd5c5f) |
| `src/lib/songs/generation-history.ts` | History query |
| `src/lib/songs/variations/` | Variations subdir (replaces variants-family.ts) |
| `src/lib/generation/song-ready-events/` | Per-domain adapters (split from handleSongSuccess) |
| `src/lib/notifications/channels.ts` | Single channel-config seam per NotificationType |
| `src/lib/error-logger/{client,server,extract,index}.ts` | Client/Server split |
| `src/lib/route-pipeline.ts` | Generic API envelope (Zod schemas, auth, params) -- FEATURE-MAP §5 mentions |
| `src/lib/route-handler.ts` | Companion to route-pipeline |
| `src/lib/event-bus.ts` | Internal pub/sub between contexts |
| `src/lib/realtime/` | SSE/WS for generation-status push -- Inventory has no Realtime category |
| `src/lib/audio/peaks-worker.ts` | Web Worker fuer peak math |
| `src/lib/scheduler.ts` + `src/lib/jobs/*` | Background-Jobs (digests, embeddings, refresh) |
| `src/lib/cache/*` | Per-request + Redis-shaped TTL cache |
| `src/lib/sanitize.ts` | UGC sanitisation |
| `src/lib/sunoapi/errors.ts` + circuit-breaker integration | External-API client (Inventory hat nur `src/lib/sunoapi/`) |
| `src/hooks/useTrackPendingSong.ts` | Hook fuer per-song generation-tracker subscription |
| `src/instrumentation.ts` | Sentry server runtime (commit fbae46a, 2026-05-15) |

### B.3 Components ohne Inventory-Eintrag

20+ Components aus T02 die in Inventory keine Erwaehnung finden:

| Component | Rolle |
|---|---|
| `BatchGeneratePanel` | Bulk-Generate UI |
| `CreateVariationModal` | "Make another version" dialog |
| `RemixModal` | Remix-this-song dialog |
| `ReactionTimeline` | Timeline-Reactions auf Waveform (sep. von `EmojiReactionPicker`) |
| `SeparateVocalsModal` | Vocals/Instrumental Split dialog |
| `StarPicker` | 5-star Rating widget (Rating model ist inventoried, Widget nicht) |
| `TagInput` | Pill-style tag input |
| `SectionEditor` | Verse/Chorus/Bridge editor |
| `StemsPlayer` | Multi-track stem mixer |
| `LibraryToolbar` | Toolbar inside LibraryView (sep. von `LibraryFilterPanel`) |
| `SongActionsBar` | Action buttons under a song |
| `SongMetadataCard` | Title/persona/duration card |
| `SongLyricsSection` | Lyrics panel in SongDetailView |
| `SongCompareView` | A/B compare two variants |
| `SongRecommendations` | "You might also like" rail |
| `RelatedSongs` | Variant-family + similar |
| `RecentlyPlayed` | Home-page rail |
| `PlaylistInviteView` | Collaborator-invite acceptance |
| `SwipeablePlaylistItem` | Swipe-to-delete row |
| `src/components/analytics/*` (5 chart components) | AdminAnalyticsCharts, InsightsCharts, PlayAnalyticsCharts, StatsCharts, UserAnalyticsCharts |
| `src/components/queue/*` (8 helpers) | Queue state ops + hooks |
| `src/components/generate-form/*` (4 helpers) | Form helpers |
| `src/components/generation-history/retry-client.ts` | Retry transport (0.2.0 commit d424236) |

### B.4 Infrastructure shifts ohne Inventory-Update

| Reality | Inventory says |
|---|---|
| GlitchTip (sentry-protocol) für Errors, hosted at errors.yester.cloud (siehe `.ytstack/journal/` + memories) | "Sentry error tracking" -- nicht falsch, aber stale |
| `src/instrumentation.ts` Sentry server runtime + `onRequestError` (commit fbae46a, 2026-05-15) | unmentioned |
| `src/lib/songs/lifecycle.ts` ist canonical seam fuer Song state transitions (DECISIONS-grade, post-0.2.0) | unmentioned |
| Per-deploy PWA cache-busting via `NEXT_PUBLIC_BUILD_ID` + `/sw.js?v=<sha>` (commit b78deb7) | "Service worker / offline" -- generic, nicht das aktuelle Pattern |

---

## C. FEATURE-MAP §2 Bounded Contexts vs. Code-Realitaet

10 Contexts gepruft. FEATURE-MAP wurde 2026-05-15 aus Code geschrieben, weitestgehend aktuell. Befunde:

| # | Context | Status | Drift |
|---|---|---|---|
| 1 | Identity | ✅ accurate | -- aber `lib/api-key-auth.ts` in §5 ist stale (datei existiert nicht mehr). |
| 2 | Billing & credits | ✅ accurate | -- |
| 3 | Generation | ✅ accurate | 17 files in `lib/generation/` (incl. `song-ready-events/` subdir post-0.2.0). FEATURE-MAP sagt "15 files" -- minor drift. |
| 4 | Library | ✅ accurate | -- |
| 5 | Playback | ✅ accurate | `lib/audio/peaks-worker.ts` Web Worker boundary explizit -- gut. |
| 6 | Authoring helpers | ✅ accurate | -- |
| 7 | Discovery & social | ✅ accurate | -- |
| 8 | Engagement loops | ✅ accurate | -- |
| 9 | Search & recommendations | ✅ accurate | -- |
| 10 | Trust & ops | ✅ accurate | -- aber Sentry → GlitchTip nicht in §5 erwaehnt. |

**FEATURE-MAP ist robust und aktuell.** Inventory ist die staerker driftende Quelle.

---

## D. Cross-Map Mismatches (Inventory ≠ FEATURE-MAP categorization)

Inventory gruppiert anders als FEATURE-MAP. Beide sind valide, aber S02 muss eine Heimat-Definition waehlen.

| Feature | Inventory section | FEATURE-MAP §2 context | Conflict? |
|---|---|---|---|
| Playlists | "Playlists" (own section) | Library (context 4) | Sub-domain of Library in FM |
| Collections | "Discovery & Recommendations" | Library (context 4) | T01 already flagged: `/discover/collections/[id]` is URL-misleading |
| Favorites | "Social Features" | Library (context 4) | Favorites are personal, not social |
| Smart playlists | "Playlists" | Search & recommendations (context 9) | FM treats it as derived/computed |
| Search | "Discovery & Recommendations" | Search & recommendations (context 9) | aligned |
| Streaks / milestones | "Analytics & Insights" | Engagement (context 8) | aligned with FM, not inventory |
| Cover art generation | "Song Generation & Management" | Authoring (context 6) | overlap -- depends on if you view it as part of Generation pipeline or post-hoc tool |
| Mashup | "Advanced Features" | Generation (context 3) | aligned with FM |
| Style boost | "Advanced Features" | Authoring (context 6) | aligned with FM |
| Onboarding | "Onboarding & First-Run" | (not its own context in FM) | Inventory section, FM weaves it through Identity + Engagement |
| Content Safety | "Content Safety" | Trust & ops (context 10) | aligned with FM |
| Platform & Infrastructure | "Platform & Infrastructure" | (not a context -- §5 Cross-cutting) | FM treats these as concerns, not bounded contexts |

**Decision-point for S02:** when assigning each feature to a Journey-station + IA-home, prefer FEATURE-MAP §2 grouping (more recent + Code-anchored) over Inventory grouping (more Marketing/Marketing-section-y). S02-T03 (Coverage-Check) sollte das festhalten.

---

## E. Summary metrics

- **Inventory entries:** 119 features in 15 sections (counted from `| ... | Built |` rows).
- **A. Drift entries:** 23 (~19% of inventory drifted in 4 weeks).
  - A.1: 11 lib-files migrated to subdirs
  - A.2: 7 files / paths gone or moved without inventory pointer
  - A.3: 4 missing models (47 claimed vs 51 actual)
  - A.4: 4 components dead but inventory-marked "Built"
  - A.5: 5 path inaccuracies
- **B. Code-features missing from inventory:** 50+ items (Routes + Libs + Components grouped).
- **C. FEATURE-MAP drift:** minor (1-2 references stale, otherwise solid).
- **D. Cross-Map mismatches needing S02 decision:** 12 features sit in different homes depending on which map you read.

`docs/feature-inventory.md` ist stale (last-updated 2026-04-22). FEATURE-MAP.md (2026-05-15, code-read) ist die zuverlaessigere Quelle fuer S02-Arbeit. Inventory sollte nach M001 aufgefrischt werden -- nicht in dieser Slice, aber als Folge-TODO vermerken.

---

End of feature-gaps.

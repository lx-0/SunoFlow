---
milestone: M001
slice: S01
task: T01
artifact: ROUTE-CATALOG
created: 2026-05-18T06:50:00Z
sources:
  - find src/app/[locale] -name page.tsx (51 files)
  - find src/app/{s,p,u,embed} -name page.tsx (5 files)
  - find src/app/api -name route.ts (224 files)
  - src/middleware.ts (auth gates)
  - src/components/AppShell.tsx (nav config)
  - .ytstack/FEATURE-MAP.md §2 (bounded context labels)
totals:
  locale_pages: 51
  public_surfaces: 5
  api_routes: 224
  appshell_primary_nav: 17
---

# M001 Route Catalog

Pure inventory. No interpretation, no consolidation recommendations -- that comes in S02.

Bounded-Context column matches `.ytstack/FEATURE-MAP.md §2` IDs:
**Identity · Billing · Generation · Library · Playback · Authoring · Discovery · Engagement · Search · Trust**.

Auth column legend:
- `public` -- no auth, no session required (middleware passthrough)
- `session` -- requires NextAuth JWT
- `admin` -- session + admin role (gated in `middleware.ts:149-160`)
- `webhook` -- callback from external system, no session, secret-validated
- `api-key` -- programmatic, bearer ApiKey
- `cron` -- secret-protected scheduler endpoint

---

## A. User-facing pages under `src/app/[locale]/*` (51 routes)

### Identity (6)

| URL | Page file | Auth | Top components |
|---|---|---|---|
| `/[locale]/login` | `login/page.tsx` | public | NextAuth signIn, Router, Link |
| `/[locale]/register` | `register/page.tsx` | public | NextAuth signIn, Router, Link |
| `/[locale]/forgot-password` | `forgot-password/page.tsx` | public | Link, useState |
| `/[locale]/reset-password` | `reset-password/page.tsx` | public | Link, useState |
| `/[locale]/verify-email` | `verify-email/page.tsx` | public | Link, useState/useEffect |
| `/[locale]/profile` | `profile/page.tsx` | session | AppShell, useSession signOut |

### Billing (2)

| URL | Page file | Auth | Top components |
|---|---|---|---|
| `/[locale]/pricing` | `pricing/page.tsx` | public | useSession, CheckIcon/XMarkIcon, Link |
| `/[locale]/settings/billing` | `settings/billing/page.tsx` | session | AppShell, Link |

### Generation (5)

| URL | Page file | Auth | Top components |
|---|---|---|---|
| `/[locale]/generate` | `generate/page.tsx` | session | AppShell, GenerateTabs, GenerateFormSkeleton |
| `/[locale]/generations` | `generations/page.tsx` | session | AppShell, GenerationHistoryView, HistorySkeleton |
| `/[locale]/mashup` | `mashup/page.tsx` | session | AppShell, InlineFeatureGate, useSession |
| `/[locale]/inspire` | `inspire/page.tsx` | session | useMemo, Router, Image (inspiration feed) |
| `/[locale]/compare` | `compare/page.tsx` | session | SongCompareView, CompareSong (variant compare) |

### Library (9)

| URL | Page file | Auth | Top components |
|---|---|---|---|
| `/[locale]/library` | `library/page.tsx` | session | AppShell, LibraryView, LibrarySkeleton |
| `/[locale]/library/[id]` | `library/[id]/page.tsx` | session | AppShell, SongDetailView, SongDetailSkeleton |
| `/[locale]/favorites` | `favorites/page.tsx` | session | AppShell, LibraryView, LibrarySkeleton |
| `/[locale]/history` | `history/page.tsx` | session | AppShell, PlayHistoryView |
| `/[locale]/playlists` | `playlists/page.tsx` | session | AppShell, PlaylistsView, PlaylistsSkeleton |
| `/[locale]/playlists/[id]` | `playlists/[id]/page.tsx` | session | AppShell, PlaylistDetailView, PlaylistDetailSkeleton |
| `/[locale]/playlists/invite/[token]` | `playlists/invite/[token]/page.tsx` | session | AppShell, PlaylistInviteView |
| `/[locale]/songs` | `songs/page.tsx` | session | AppShell, SongsGalleryView, SongsGallerySkeleton |
| `/[locale]/discover/collections/[id]` | `discover/collections/[id]/page.tsx` | session | CollectionDetailView (collection = library bundle, but URL lives under /discover) |

### Authoring (3)

| URL | Page file | Auth | Top components |
|---|---|---|---|
| `/[locale]/personas` | `personas/page.tsx` | session | AppShell, PersonaManager, SkeletonText |
| `/[locale]/templates` | `templates/page.tsx` | session | AppShell, TemplatesPageContent |
| `/[locale]/style-templates` | `style-templates/page.tsx` | session | (no import-side components; lazy/dynamic) |

### Discovery (5)

| URL | Page file | Auth | Top components |
|---|---|---|---|
| `/[locale]/discover` | `discover/page.tsx` | session | DiscoverView (cached) |
| `/[locale]/explore` | `explore/page.tsx` | session | DiscoverView (same component as /discover, different filter) |
| `/[locale]/feed` | `feed/page.tsx` | session | useSession, Image, Link (activity feed) |
| `/[locale]/radio` | `radio/page.tsx` | session | MoodRadioView |
| `/[locale]/users/[id]` | `users/[id]/page.tsx` | session | useSession, Image, Link (in-app profile view) |

### Engagement (6)

| URL | Page file | Auth | Top components |
|---|---|---|---|
| `/[locale]/notifications` | `notifications/page.tsx` | session | AppShell, NotificationsView |
| `/[locale]/stats` | `stats/page.tsx` | session | AppShell |
| `/[locale]/insights` | `insights/page.tsx` | session | AppShell |
| `/[locale]/analytics` | `analytics/page.tsx` | session | AppShell, useSession, Link |
| `/[locale]/dashboard/analytics` | `dashboard/analytics/page.tsx` | session | AppShell, Link |
| `/[locale]/dashboard/analytics/[songId]` | `dashboard/analytics/[songId]/page.tsx` | session | AppShell, Link |

### Trust & ops (13)

| URL | Page file | Auth | Top components |
|---|---|---|---|
| `/[locale]/admin` | `admin/page.tsx` | admin | useState/useEffect (overview) |
| `/[locale]/admin/users` | `admin/users/page.tsx` | admin | Link, useState/useEffect |
| `/[locale]/admin/users/[id]` | `admin/users/[id]/page.tsx` | admin | Link, ArrowLeftIcon |
| `/[locale]/admin/reports` | `admin/reports/page.tsx` | admin | Image, useState/useEffect |
| `/[locale]/admin/appeals` | `admin/appeals/page.tsx` | admin | CheckCircleIcon/XCircleIcon |
| `/[locale]/admin/content` | `admin/content/page.tsx` | admin | FlagIcon, useState/useEffect |
| `/[locale]/admin/moderation` | `admin/moderation/page.tsx` | admin | Image, useState/useEffect |
| `/[locale]/admin/errors` | `admin/errors/page.tsx` | admin | useState/useEffect |
| `/[locale]/admin/logs` | `admin/logs/page.tsx` | admin | useState/useEffect |
| `/[locale]/admin/metrics` | `admin/metrics/page.tsx` | admin | Image, useState/useEffect |
| `/[locale]/admin/analytics` | `admin/analytics/page.tsx` | admin | useState/useEffect/useCallback |
| `/[locale]/admin/mirror` | `admin/mirror/page.tsx` | admin | useState/useCallback (DB mirror health) |
| `/[locale]/api-docs` | `api-docs/page.tsx` | session | Swagger UI (server-rendered) |

### Misc / Home (2)

| URL | Page file | Auth | Top components |
|---|---|---|---|
| `/[locale]` | `page.tsx` | public | LandingPage |
| `/[locale]/settings` | `settings/page.tsx` | session | useSession, Link (account settings) |

---

## B. Public surfaces outside `[locale]/*` (5 routes)

Permalink-style URLs that bypass locale and skip auth. Not part of the internal navigation -- they exist as shareable artifacts and embed targets.

| URL | Page file | Auth | Bounded context | Top components |
|---|---|---|---|---|
| `/s/[slug]` | `s/[slug]/page.tsx` | public | Discovery | PublicSongView (37 commits, hot) |
| `/p/[slug]` | `p/[slug]/page.tsx` | public | Discovery | PublicPlaylistView |
| `/u/[username]` | `u/[username]/page.tsx` | public | Discovery | PublicProfileView |
| `/embed/[songId]` | `embed/[songId]/page.tsx` | public | Discovery | EmbedSongPlayer |
| `/embed/playlist/[slug]` | `embed/playlist/[slug]/page.tsx` | public | Discovery | EmbedPlaylistPlayer |

---

## C. API routes (224 routes, grouped by bounded context)

Per FEATURE-MAP §2. Detail-level: count per group + sub-prefixes + dominant HTTP methods + auth. Per-route purpose only for the high-churn or cross-cutting endpoints.

### Identity (20)

| Mount prefix | Count | Methods | Auth | Notes |
|---|---|---|---|---|
| `/api/auth/*` (NextAuth + helpers) | 7 | GET POST | public/session | `[...nextauth]`, change-password, forgot-password, providers-config, resend-verification, reset-password, verify-email |
| `/api/account` | 1 | GET PATCH DELETE | session | Account-level mgmt |
| `/api/register` | 1 | POST | public | Signup |
| `/api/onboarding/*` | 2 | POST | session | complete, reset |
| `/api/profile/*` | 9 | GET PUT DELETE | session | profile (root), api-key, api-keys, api-keys/[id], email-preferences, genres/suggest, password, preferences, stats |

### Billing (9)

| Mount prefix | Count | Methods | Auth | Notes |
|---|---|---|---|---|
| `/api/billing/*` | 8 | GET POST | session/webhook | cancel, checkout, invoices, portal, status, subscription, topup, **webhook** (Stripe) |
| `/api/credits` | 1 | GET | session | Current credit balance |

### Generation (15)

| Mount prefix | Count | Methods | Auth | Notes |
|---|---|---|---|---|
| `/api/generate` | 1 | POST | session | Heart of the app (42 commits, hot) |
| `/api/generate/auto` | 1 | POST | session | Auto-generation flow |
| `/api/generate/[jobId]/stream` | 1 | GET (SSE) | session | Realtime generation status |
| `/api/generation-queue/*` | 4 | GET POST DELETE | session | queue (root), process-next, reorder, [id] |
| `/api/generations` | 1 | GET | session | Generation history list |
| `/api/suno/*` | 4 | GET POST | session/admin | circuit-breaker, import, songs, status |
| `/api/style-boost` | 1 | POST | session | LLM style-prompt enhancer |
| `/api/lyrics/generate` | 1 | POST | session | LLM lyrics tool |
| `/api/mashup` | 1 | POST | session | Mashup flow |

### Library (75)

| Mount prefix | Count | Methods | Auth | Notes |
|---|---|---|---|---|
| `/api/songs/*` (root + actions) | 11 | GET POST | session/api-key/public | songs (root), batch, batch-generate, batch-status, discover, favorites, genres, moods, public, trending |
| `/api/songs/[id]/*` | 39 | GET POST PATCH DELETE | session | Per-song actions: add-instrumental/add-vocals, archive/restore, analytics, cover-art (+ generate), comments (+ [commentId]), convert-wav, download, extend, favorite, feedback (+ summary), generate-midi, lyrics (+ annotations + timestamps), music-video (+ status), play, playable-versions, rating, reactions (+ [reactionId]), refresh, related, replace-section, retry, route (root), separate-vocals, share, similar, status, stems, tags (+ [tagId]), variations, also-liked |
| `/api/playlists/*` | 15 | GET POST PATCH DELETE | session | Root + 13 per-playlist actions (activity, collaborative, collaborators (+ [id]), copy, play, publish, reorder, route, share, songs (+ [songId])), discover, invite/[token] |
| `/api/collections/*` | 2 | GET POST PATCH DELETE | session | Root + [id] |
| `/api/tags/*` | 2 | GET POST DELETE | session | Root + [id] |
| `/api/history` | 1 | GET POST | session | Play history |
| `/api/upload` | 1 | POST | session | File upload (audio) |
| `/api/export` | 1 | GET | session | Data export |
| `/api/audio/[songId]` | 1 | GET | session | Signed-URL issuance (16 commits, hot) |
| `/api/audio/public/[songId]` | 1 | GET | public | Public signed URL |
| `/api/images/[songId]` | 1 | GET | session | Image proxy |

### Playback (1)

| Mount prefix | Count | Methods | Auth | Notes |
|---|---|---|---|---|
| `/api/user/playback-state` | 1 | GET PATCH | session | Persisted player state |

### Authoring (11)

| Mount prefix | Count | Methods | Auth | Notes |
|---|---|---|---|---|
| `/api/personas/*` | 2 | GET POST PUT DELETE | session | Root + [id] |
| `/api/prompt-templates/*` | 2 | GET POST PUT DELETE | session | Root + [id] |
| `/api/style-templates/*` | 2 | GET POST PUT DELETE | session | Root + [id] |
| `/api/prompts/*` | 2 | GET | session | daily, generate |
| `/api/presets/*` | 2 | GET POST PUT DELETE | session | Root + [id] |
| `/api/agent-skill` | 1 | GET | public | Plugin metadata |

### Discovery (26)

| Mount prefix | Count | Methods | Auth | Notes |
|---|---|---|---|---|
| `/api/discover` | 1 | GET | session | Discover feed |
| `/api/feed` | 1 | GET | session | Activity feed |
| `/api/radio` | 1 | GET | session | Mood radio stream |
| `/api/feed-generations/*` | 3 | GET POST | session/cron | Root + [id], [id]/approve |
| `/api/u/[username]/*` | 5 | GET | public/session | Root, liked-songs, milestones, playlists, songs |
| `/api/users/*` | 5 | GET POST DELETE | session | [id], [id]/activity, [id]/follow, me/export, me/following |
| `/api/ratings` | 1 | GET POST | session | Song ratings |
| `/api/feedback` | 1 | POST | session | In-app feedback |
| `/api/error-report` | 1 | POST | public/session | Client-reported errors |
| `/api/instagram/fetch` | 1 | GET | session | External-asset fetch |
| `/api/rss/*` | 3 | GET POST | public | feeds, feeds/[id], fetch |
| `/api/digests/*` | 3 | GET POST | session/cron | Root, [id], generate |

### Engagement (12)

| Mount prefix | Count | Methods | Auth | Notes |
|---|---|---|---|---|
| `/api/notifications/*` | 3 | GET POST PATCH | session | Root, [id]/read, read-all |
| `/api/push/*` | 3 | GET POST | session | preferences, subscribe, vapid-public-key |
| `/api/streaks` | 1 | GET | session | User streak |
| `/api/milestones` | 1 | GET | session | User milestones |
| `/api/email/*` | 2 | GET POST | public/cron | unsubscribe, weekly-highlights |
| `/api/events` | 1 | POST | session | Event-bus emit |
| `/api/insights` | 1 | GET | session | User insights |

### Search & recommendations (7)

| Mount prefix | Count | Methods | Auth | Notes |
|---|---|---|---|---|
| `/api/search` | 1 | GET | session | Unified search |
| `/api/recommendations/*` | 3 | GET | session | Root, daily, similar |
| `/api/smart-playlists` | 1 | GET POST | session | Smart playlist mgmt |
| `/api/suggestions/*` | 2 | GET | session | prompts, trending |
| (`/api/suno/songs` lives under Generation -- inspiration feed) | -- | | | cross-ref only |

### Trust & ops (48)

| Mount prefix | Count | Methods | Auth | Notes |
|---|---|---|---|---|
| `/api/admin/*` | 22 | GET POST PATCH DELETE | admin | appeals (+ [id]), backfill-images, content (+ [id]/flag), errors, feedback, logs, metrics, mirror-health, reports (+ [id], bulk, count), sentry-test, stats, users (+ [id], [id]/credits, [id]/history, [id]/plan, [id]/toggle) |
| `/api/analytics/*` | 8 | GET POST | session/admin | admin, generation-insights, overview, play, prompt-quality, songs/[songId], user, view |
| `/api/dashboard/*` | 2 | GET | session | stats, usage |
| `/api/cron/*` | 3 | GET POST | cron | feed-auto-generate, generate-embeddings, refresh-smart-playlists |
| `/api/webhooks/*` | 2 | POST | webhook | stripe, suno |
| `/api/health` | 1 | GET | public | Railway liveness |
| `/api/metrics` | 1 | GET | admin | Server metrics |
| `/api/rate-limit/*` | 2 | GET | session | Root, status |
| `/api/appeals` | 1 | GET POST | session | User-facing appeal |
| `/api/reports` | 1 | GET POST | session | User-facing report |
| `/api/feedback` | (counted above) | | | |
| `/api/error-report` | (counted above) | | | |
| `/api/test/login` | 1 | POST | public (dev) | E2E auth helper |
| `/api/settings` | 1 | GET PATCH | session | App-level settings |
| `/api/stats/user` | 1 | GET | session | User stats |
| `/api/v1/openapi.json` | 1 | GET | public | OpenAPI schema |
| `/api/docs` | 1 | GET | public | Swagger UI route |

**API grand total:** 224 (matches `find` count).

---

## D. AppShell primary navigation (17 items)

Source: `src/components/AppShell.tsx:56-72`. This is the primary symptom the user named: "viele navigationsitems".

| # | Key | href | Icon |
|---|---|---|---|
| 1 | home | `/` | HomeIcon |
| 2 | library | `/library` | BookOpenIcon |
| 3 | inspire | `/inspire` | LightBulbIcon |
| 4 | generate | `/generate` | PlusCircleIcon |
| 5 | templates | `/templates` | BookmarkIcon |
| 6 | personas | `/personas` | UserGroupIcon |
| 7 | mashup | `/mashup` | SparklesIcon |
| 8 | feed | `/feed` | RssIcon |
| 9 | radio | `/radio` | MusicalNoteIcon |
| 10 | explore | `/explore` | Squares2X2Icon |
| 11 | discover | `/discover` | GlobeAltIcon |
| 12 | playlists | `/playlists` | QueueListIcon |
| 13 | favorites | `/favorites` | HeartIcon |
| 14 | history | `/history` | ClockIcon |
| 15 | generations | `/generations` | RectangleStackIcon |
| 16 | analytics | `/analytics` | ChartBarIcon |
| 17 | stats | `/stats` | PresentationChartLineIcon |

Plus secondary entries surfaced in the AppShell header/menu (not part of the 17): `/pricing`, `/settings`, `/settings/billing`, `/admin`, `/profile`.

---

## E. Observations (no recommendations, just things to feed S02)

1. **17 primary nav items** vs. ~5-7 fingers-on-thumbs target → consolidation pressure is real.
2. **Three near-duplicate Discovery surfaces:** `/discover`, `/explore`, `/radio`, plus `/feed`, plus `/inspire`. Five entry points for "see what's out there".
3. **Two Generation entry-points:** `/generate` (form) and `/generations` (history). Plus `/mashup` and `/inspire` which both produce songs. Plus `/compare`.
4. **Three Analytics surfaces:** `/analytics`, `/stats`, `/insights`, plus `/dashboard/analytics` (and `/dashboard/analytics/[songId]`). Four if you count the admin one.
5. **Authoring helpers split across three top-level items:** `/personas`, `/templates`, `/style-templates`. All under FEATURE-MAP §6.
6. **Library is well-consolidated already** (one nav item) but spans 9 user-facing pages. `/songs` and `/library` overlap; `/favorites` is a filter on library.
7. **`/discover/collections/[id]`** is the only deep page under `/discover` -- but collections are Library-domain. URL location is misleading.
8. **`/api/songs/[id]/*` = 39 routes.** Single domain object with the largest API surface. Many are mutually exclusive actions (download / extend / retry / archive / restore / share / replace-section) that could share a `/songs/[id]/actions/[verb]` shape -- not a UX concern, but a clue to where complexity hides.
9. **Admin = 12 user-facing pages + 22 API routes.** Self-contained sub-app. Should stay isolated in the IA -- not part of main nav.
10. **`/api-docs`** is gated by session but discoverable for power users. Should be in a tools/devmenu, not top-level.

---

End of catalog.

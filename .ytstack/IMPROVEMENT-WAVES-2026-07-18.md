# Improvement Waves — Deep Research 2026-07-18

> Ten-lens deep research across the whole app (web, mobile, core, MCP, data,
> ops, product, DX) for the next improvement program. Eight lenses completed;
> the **Security** and **Web-Performance** lenses hit the session usage limit
> and are appended separately once re-run (marked PENDING below). Everything
> shipped 2026-07-17 (mobile UX waves, playback fixes, DB incident + self-heal,
> architecture deepening) was excluded — every finding here is NEW and
> evidence-based (file:line / counts in the appendix).

## The headline

**The web app never received the design migration the mobile app just got.**
PROD renders in Arial on pure-white surfaces with the banned violet accent:
`globals.css` still carries the full legacy system (`--accent: #7c3aed`,
`#ffffff` surfaces, a literal `font-family: Arial` line), Geist Sans is loaded
but consumed by nothing, Geist Mono is shipped but wired nowhere, and violet
utility literals have GROWN to 1752 across 177 files (spec quoted 1049) with
zero token indirection. The research also found the cheap bridge: alias Tailwind's
`violet-*` palette to the DESIGN.md magenta ramp in `tailwind.config.ts` and
the whole app recolors on the next build — turning a milestone-sized rewrite
into a config change plus on-touch cleanup.

## Wave 0 — Quick wins (each ≤ 1 session, independently shippable)

1. **globals.css + fonts fix (S, high)**: replace the legacy CSS-var block with
   the DESIGN.md tokens, delete the Arial line, wire Geist Sans/Mono through
   Tailwind `fontFamily`. Single most visible brand fix in the repo.
2. **Violet→magenta Tailwind alias bridge (S, high)**: recolors all 1752
   literals at build time; semantic tokens migrate on touch afterwards.
3. **cdn1 TTL host-aware (S, high)**: permanent cdn1 URLs are stamped with a
   12-day TTL, so the self-heal re-refreshes ~80% of the catalog against the
   flaky aggregator on every boot — skip refresh for `cdn1.suno.ai` hosts.
4. **Self-heal observability (S, high)**: the cdn1 fallback emits no countable
   signal — add a GlitchTip/metric event so the next aggregator host death is
   visible on day one, not week five.
5. **`extend_song` title bug (S)**: operator-precedence bug discards the
   caller's title (MCP lens) — real bug, two-line fix + test.
6. **Mobile deep-link/notification group-qualify (S)**: notification taps
   currently always land in the Library tab and orphan Back.
7. **MCP noise (S)**: routine 401/403/429 captured as GlitchTip exceptions —
   downgrade to counters.
8. **PlaybackState cascade (S)**: deleting ONE song wipes the owner's whole
   queue/position/EQ state — scope the cascade.
9. **Retention jobs (S)**: analytics/notification/error tables are append-only
   with no retention while Session/RateLimit have jobs.
10. **Honest audit gate (S)**: every high/critical is currently on the pnpm
    audit ignore list while SECURITY.md claims the opposite — re-triage.
11. **Hollow e2e assertions (S)**: playlist-mutation e2e never verifies
    persistence; agentic smoke test silently skipped in CI.
12. **Mashup paywall decision (S, product call — USER)**: `mashupStudio:
    minTier 'starter'` locks one of PRODUCT.md's "three equal modes" for the
    whole free beta. One line — but the strategy call is the operator's.

## Wave A — Web brand migration (the user-visible one; M-sized after the bridge)

Quick wins 1+2 first (instant recolor + fonts), then: migrate the AppShell —
the single most off-brand surface (legacy palette, Heroicons vs Lucide, no
dark-first) — to the DESIGN.md console look; dark-first surfaces app-wide;
replace literal classes with semantic tokens on touch; kill the 29 hardcoded
`#7c3aed` chrome literals (PWA themeColor, focus ring, skip link).

## Wave B — Product IA (milestone-sized; revive M002 via ytstack)

The M001 follow-up roadmap (D3–D14) was superseded by MCP/mobile milestones
and never shipped: Generate progressive-disclosure, the 4-names-for-one-concept
consolidation (Preset/Template/Style Template/Saved Style), the 17→8 IA
consolidation (analytics ×4, authoring hub, compare), and Discover still ships
the exact "Made for you" auto-rails PRODUCT.md bans. This is a plan-milestone
candidate, not BAU.

## Wave C — Reliability + engineering hygiene (M)

Mobile crash telemetry (app ships with ZERO error reporting — GlitchTip via
sentry-expo, replay off), cron run-history + job-health alerts (RSS/embedding
crons have no in-repo trigger and no history), file-cache eviction + disk
monitoring on the fixed Railway volume, migrate-drift hack removal (prod boots
on a hard-coded `migrate resolve --rolled-back`), billing tests (checkout.ts
untested; route tests only re-assert their own mocks), mashup test coverage,
mobile CI gate (tsc/lint/Maestro — currently entirely ungated), Prisma 5→7 +
ESLint 8→10 upgrades, local-dev recipe consolidation (4 divergent DB recipes;
README's docker compose path cannot start the app).

## Wave D — Mobile next (post device-pass)

Universal Links (share links can't reopen the app), offline affordance
(playback fails silently in airplane mode), push pipeline + badge (L; UI ships
but nothing behind it), useListResource v2 (pagination + nullable-success →
absorbs index/discover/search/inspire), store-readiness gaps (splash,
mic-permission workaround, privacy manifest).

## PENDING lenses

- **Security** and **Web-Performance** hit the session usage limit; re-run
  scheduled. Their findings append here when available.

## Suggested sequence

Wave 0 (1–2 sessions, immediate value + risk burn-down) → Wave A
(user-visible brand) → Wave C (ops safety net) → Wave B as a proper ytstack
milestone → Wave D after the device pass. The mashup-paywall and
tap-to-full-player product calls gate parts of B/D and need the operator.

Full evidence per lens below.

## Lens: Web-UX vs Spec

The web app still does not match DESIGN.md, and on the palette front the gap has widened: violet utility usage is now 1752 occurrences across 177 of 275 tsx files (up from the spec's quoted 1049), with zero token indirection — every violet class is a hardcoded literal, so no CSS-var swap can migrate them. globals.css remains the full legacy light-purple system (pure-white surfaces, `--accent: #7c3aed`), the Arial bug DESIGN.md flagged is still at line 76, Geist Sans is loaded but never applied (the app renders in Arial), and Geist Mono ships in the repo but is wired nowhere. Two June findings are genuinely FIXED: the two-shell split is gone (all pages now share one AppShell with the top bar), and the Library empty state is now instructive ('No songs yet → Generate your first song'), though both landed in the legacy palette. Still true today: Mashup is paywalled at minTier 'starter' (contradicting three-equal-modes), Generate exposes four names for one stored-config concept, and the banned recommendation-rail pattern is auto-generated on every Playlists visit plus across Discover. The single highest-leverage move is to introduce a token layer in tailwind.config.ts that aliases Tailwind's `violet` ramp to the DESIGN.md magenta oklch scale and wires both Geist fonts — a one-to-three-file change that recolors and re-typesets the entire PROD app at once and unblocks incremental migration of everything else.

### [HIGH/L] No design-token layer exists, so the 1752 hardcoded violet literals cannot be migrated by a token swap — and violet has grown ~30% since the spec was written

DESIGN.md (line 291) quotes 1049 `text-violet-*`/`bg-violet-*` usages as the migration backlog. Today the codebase has 1752 `violet-<n>` utility occurrences (bg- 728, text- 641, border- 201, ring- 143, accent- 16, from- 10, shadow- 8, to- 3) across 177 of 275 tsx files, plus 122 purple/indigo/pink occurrences and 44 raw violet hex literals. The bg+text subset alone is 1369, up from the spec's 1049 — the backlog is expanding, not shrinking. Critically, there is ZERO token indirection: `grep` for `text-accent`/`bg-accent`/`var(--accent)` in components returns 0. Every violet class is a literal Tailwind color (`text-violet-400`), none reference the `--accent` CSS var in globals.css. tailwind.config.ts (whole file) defines no brand tokens at all — only `background`/`foreground` mapped to two CSS vars, plus keyframes. Changing `--accent` in globals.css therefore recolors nothing. A migration cannot be a CSS-var flip; it is a literal rewrite of 1752 call sites unless a bridge is introduced.

**Proposal:** Add the DESIGN.md oklch scale (magenta, surface-deep/…/hover, border, status-*, text-*) to `tailwind.config.ts` theme.extend.colors as named tokens, and as a bridge alias Tailwind's `violet-{50..900}` palette to the magenta oklch ramp so the existing 1752 literals recolor automatically on the next build (instant PROD win, near-zero diff). Then migrate literal class names to semantic tokens on-touch. This converts a milestone-sized rewrite into a config change plus incremental cleanup.

**Impact:** Every one of the handful of beta users currently sees a fully violet, off-brand app in PROD; the operator faces a 177-file rewrite with no shortcut until a token/alias layer exists.

_Files:_ `tailwind.config.ts`, `src/app/globals.css`, `DESIGN.md`

### [HIGH/S] globals.css is still 100% the legacy light-purple system, Geist Sans is loaded but never applied (app renders in Arial), and Geist Mono is shipped but unwired

globals.css:5-71 still defines the old system: `--surface: #ffffff` and `--card-bg: #ffffff` (DESIGN.md bans pure white), `--background: #f9fafb`, `--accent: #7c3aed` (violet), `--player-bg: #111827` (untinted gray, not tinted-near-black). None of DESIGN.md's oklch tokens exist. globals.css:76 still declares `font-family: Arial, Helvetica, sans-serif` — the exact stale bug DESIGN.md line 292 calls out to remove. Worse: layout.tsx loads `geistSans` and sets `geistSans.variable` on the body (line 132), but tailwind.config.ts defines no `fontFamily`, and globals.css:76 hardcodes Arial — so nothing consumes `--font-geist-sans` and the entire app renders in Arial/system, not Geist Sans. GeistMonoVF.woff exists in src/app/fonts but is wired nowhere (0 references to geist-mono/GeistMono anywhere), so the `font-mono` classes used for lyrics/IDs fall back to the browser default monospace — DESIGN.md's Mono-for-Content rule is entirely unmet. The focus ring (globals.css:129), skip link (line 115), and PWA `themeColor` (layout.tsx:89) are all hardcoded `#7c3aed` (29 `7c3aed` literals total).

**Proposal:** In one pass over globals.css + layout.tsx + tailwind.config.ts: replace the CSS-var block with DESIGN.md's oklch tokens, delete the Arial line, load Geist Mono via localFont and expose `--font-geist-mono`, map `fontFamily.sans`→var(--font-geist-sans) and `fontFamily.mono`→var(--font-geist-mono) in Tailwind, and swap the three `#7c3aed` chrome literals to magenta. This is the single cheapest, most visible brand improvement — one to three files.

**Impact:** Every screen in PROD currently renders in Arial on pure-white surfaces with a violet accent — the opposite of the locked 'late-night studio console' brand — despite the correct fonts already sitting in the repo.

_Files:_ `src/app/globals.css`, `src/app/[locale]/layout.tsx`, `src/app/fonts/GeistMonoVF.woff`

### [MEDIUM/S] Mashup is still paywalled behind 'starter', keeping one of PRODUCT.md's three equal modes locked for every free/beta user

feature-gates.ts:18-19 sets `mashupStudio: { minTier: 'starter' }`. mashup/page.tsx wraps the studio in `<InlineFeatureGate featureKey="mashupStudio" tier={tier}>` where tier defaults to 'free', so a fresh user gets a lock icon and 'Upgrade to Starter' (FeatureGate.tsx:82-95) instead of the tool. This is the exact contradiction JOURNEYS flagged in June and it is unchanged: PRODUCT.md says 'all three modes first-class on the same surface, no mode is primary,' yet Edit (which is only Mashup — there is no other Edit route) is the one mode locked. The whole closed beta runs on the free tier, so in practice zero users can reach the Edit mode the strategy calls first-class.

**Proposal:** Make the strategic call and encode it: either set mashupStudio minTier to 'free' (one-line change to honor PRODUCT.md's three-equal-modes) or amend PRODUCT.md to state Edit is a paid mode. Leaving code and the locked spec in disagreement is the worst state.

**Impact:** Every beta tester is blocked from a third of the product's promised surface; the locked product spec and shipped behavior openly contradict each other.

_Files:_ `src/lib/feature-gates.ts`, `src/app/[locale]/mashup/page.tsx`, `src/components/FeatureGate.tsx`

### [MEDIUM/M] The Generate form still exposes four names for one stored-config concept: Preset, Template, Saved Style, Style Template

generate-form/ ships both PresetPickerPanel.tsx ('Presets (n)' button + 'Save as preset', PresetPickerPanel.tsx:91,99) and TemplatePickerPanel.tsx ('Templates' + 'Save as template'), and copy across components still uses 'Apply Saved Style'/'saved style' and 'Style Template' (label counts: style template 6, Style Template 3, saved style 1, Save as template 1, Save as preset 1, Apply Saved Style 1). There are separate `usePresetActions` and `useTemplateActions` hooks and separate API paths. All four label a stored generation configuration. JOURNEYS named this the second-highest friction after the empty-state bug, and it is unchanged. The sidebar still carries both `/templates` and `/style-templates` routes reinforcing the split.

**Proposal:** Pick one user-facing term (e.g. 'Preset') and one 'Save' affordance in the Generate form, collapse the two picker panels into one, and reconcile the underlying preset/template/style-template APIs behind it. Retire or redirect the duplicate sidebar route.

**Impact:** The core tool is harder to learn than the music decisions it captures; new users cannot tell Preset from Template from Style Template.

_Files:_ `src/components/generate-form/PresetPickerPanel.tsx`, `src/components/generate-form/TemplatePickerPanel.tsx`, `src/components/generate-form/useTemplateActions.ts`, `src/components/generate-form/usePresetActions.ts`

### [MEDIUM/M] The banned recommendation-rail / 'Made for you' pattern is still generated automatically on the Playlists page and in Discover

playlists/page.tsx:24 calls `ensureDefaultSmartPlaylists(userId)` on every load, which auto-creates the 'Top Hits', 'New This Week', and 'Mood: Chill' smart playlists rendered with SmartPlaylistBadge (PlaylistsView.tsx:50-52). DESIGN.md and PRODUCT.md explicitly reject 'Made for you sections, recommendation rails, algorithmic feed surfaces.' These are exactly that, with a different label. It is not isolated: DiscoverView.tsx has For You/Trending/Popular tabs (line 693), a `useDiscoverTrending` hook, and `/api/recommendations/daily` + `/similar` are consumed by DashboardView and SongRecommendations. The June contradiction ('workbench, not a recommendation engine') is still fully shipped.

**Proposal:** Make the strategic decision JOURNEYS deferred: either remove the `ensureDefaultSmartPlaylists` call plus the smart-playlist UI and collapse the Discover/recommendations rails, or amend PRODUCT.md to admit a discovery layer. Half-shipping an anti-feed strategy with live recommendation rails is the worst outcome.

**Impact:** The shipped product actively does what the locked spec twice forbids; every playlist visit manufactures algorithmic rails the brand says it is not.

_Files:_ `src/app/[locale]/playlists/page.tsx`, `src/components/PlaylistsView.tsx`, `src/lib/smart-playlists.ts`, `src/app/[locale]/discover/DiscoverView.tsx`

### [MEDIUM/M] The two-shell split is fixed (all pages now share AppShell), but that surviving shell is the single most off-brand surface: legacy palette, Heroicons instead of Lucide, and a 5-tab bottom nav

Good news first: JOURNEYS' 'two coexisting shells' finding is resolved — every authed route (generate, mashup, library, history, playlists, templates, settings, feed, etc.) now wraps a single `<AppShell>` with the same sidebar + top bar, so the top bar is no longer missing on Generate/Mashup. But AppShell.tsx itself is entirely legacy: violet-400 wordmark (lines 142, 292, 412), `bg-white dark:bg-gray-900` surfaces and gray borders throughout, active nav is `bg-violet-50 dark:bg-violet-900/20 text-violet-600`, and it imports 20+ Heroicons where DESIGN.md section 5 specifies Lucide 22px stroke-1.5. The mobile bottom nav (line 509, `navItems.slice(0,5)`) renders Home/Library/Inspire/Generate/Templates — five tabs, not the spec's Browse/Generate/Edit, and Mashup/Edit is absent from it entirely. Because this shell frames 100% of authed screens, it is the highest-visibility target for the design wave after the token/font fixes.

**Proposal:** After the token layer lands (finding 1), rebuild AppShell against the semantic tokens, swap Heroicons for Lucide, and reduce the mobile bottom nav to the three spec modes plus a 'more' slot. Because it is one component wrapping the whole app, the visible payoff per line changed is the highest in the codebase.

**Impact:** The chrome around every screen carries the old brand; fixing it upgrades the perceived quality of all 20 routes at once.

_Files:_ `src/components/AppShell.tsx`


## Lens: Mobile Next

Post-waves, the mobile app's internal architecture is genuinely solid; the leftovers cluster in the connective tissue to the outside world — deep links, push, offline — plus a hook-consistency tail. The single highest-leverage cheap win is group-qualifying notification/deep-link targets (Finding 1): today a tapped notification always dumps the user into the Library tab and orphans Back, and the fix is the one-line `activeTabGroup()` pattern already proven in `closePlayerThen`. The most strategically important gap is Universal Links (Finding 2): the app builds https share URLs that can never reopen the app because no `associatedDomains` is configured, so its own share/growth loop bypasses the native app entirely. Notifications are inert on iOS end-to-end — preference toggles with no APNs pipeline and an unread count that's fetched but never badged in chrome (Finding 3). On the useListResource question: yes, a v2 is warranted — a paginated variant would fold the three busiest screens (Library/Discover/Search) that still hand-roll the exact race-guard the hook exists to remove, and a nullable-success flag would let Inspire adopt it (Finding 4). Offline behavior (Finding 5) and App-Review readiness — splash, mic-permission workaround, empty privacy data types (Finding 6) — round out the list; several of these can only be fully characterized once the device pass and a paid Apple account are in hand.

### [MEDIUM/S] Notification taps (and any deep link) always land in the Library tab, orphaning Back

notifications.tsx:61 navigates a tapped row with `router.push(target as Href)` where `target` is a bare href like `/song/<id>` or `/playlist/<id>` (built in api/notifications.ts:45-57). Every detail screen lives in the shared 5-way route group `(library,playlists,favorites,history,profile)`, and expo-router resolves a bare shared-group href into the FIRST group — Library. The codebase already knows this: navigation.ts:119-126 (`closePlayerThen`) group-qualifies its push for exactly this reason, and NAVIGATION.md:107-113 documents the Library-only resolution for cold-start deep links. The Notifications screen is reachable via the sidebar from ANY tab, so tapping a notification opened from Profile/Playlists pushes the song onto the Library stack; Back then returns to the Library index, not to Notifications where the user tapped.

**Proposal:** Reuse the `activeTabGroup()` qualification from `closePlayerThen`: in notifications.tsx (and any future cold-start deep-link handler) qualify the target as `/(tabs)/<group><target>` before pushing, so the detail lands on the current tab and Back returns to the list the user came from. This is the same one-line pattern already proven in navigation.ts.

**Impact:** Anyone who uses the notifications list from a non-Library tab gets teleported to Library and loses their back path — a disorienting 'where am I' break the same day the rest of the nav model was made rigorously predictable.

_Files:_ `apps/mobile/app/(tabs)/(library,playlists,favorites,history,profile)/notifications.tsx`, `apps/mobile/src/navigation.ts`, `apps/mobile/src/api/notifications.ts`

### [MEDIUM/M] The app's own share links can't reopen the app — no Universal Links configured

share.ts:30-36 builds share URLs as `https://sunoflow.app/s/<slug>` (songs) and `https://sunoflow.app/p/<slug>` (playlists), but app.json has no `ios.associatedDomains` (grep for `associatedDomains`/`applinks` returns nothing) and the only registered scheme is the custom `sunoflow://`. Without an Associated Domains entitlement + apple-app-site-association, tapping a SunoFlow https link on an iPhone opens Safari (the web PWA), never the native app. No code path produces a `sunoflow://` link, so the custom scheme — and the cold-start deep-link handling described in NAVIGATION.md — is effectively unreachable in practice. The native share feature therefore drives web re-engagement, never native.

**Proposal:** Add `ios.associatedDomains: ["applinks:sunoflow.app"]` to app.json, serve `/.well-known/apple-app-site-association` on the web app mapping `/s/*` and `/p/*` to the app, and add a `+native-intent` (or root-linking) layer that rewrites those paths to group-qualified in-app routes. Verify the whole share→open loop on the device pass.

**Impact:** Sharing is central to a 'power-user workbench' with a handful of users spreading it word-of-mouth; today every shared link bypasses the app they were shared from, so the app can never be the destination of its own growth loop.

_Files:_ `apps/mobile/src/lib/share.ts`, `apps/mobile/app.json`, `apps/mobile/NAVIGATION.md`

### [MEDIUM/L] Push-preference UI ships, but the native app has no push pipeline and no unread badge — the notification surface is entirely passive on iOS

notification-settings.tsx renders three push toggles (pushGenerationComplete/pushNewFollower/pushSongComment) that PATCH `/api/push/preferences` (notification-prefs.ts:22-55), but the native app has zero push infrastructure: no `expo-notifications` dependency (package.json), no APNs entitlement/UIBackgroundModes remote-notification in app.json, and no device-token registration anywhere (grep). Those toggles only drive web-push on the PWA; on iOS native they are inert. Separately, `unreadCount` is fetched (api/notifications.ts:66) but never surfaced in app chrome — grep shows it is consumed only inside notifications.tsx itself, so there is no badge on a tab, sidebar row, or header. A user who enables 'notify me when generation completes' and locks the phone gets nothing, and can only discover any notification by manually opening Sidebar → Notifications. This directly undercuts the UX-REVIEW's own guidance (generate.tsx:255) that async completion should be signaled by a notification/badge rather than a foreground yank.

**Proposal:** Two independently shippable pieces: (1) cheap now — surface `unreadCount` as a badge on the sidebar Notifications row / a tab, and poll it on focus, so the passive list at least becomes discoverable; (2) device-gated — wire `expo-notifications` + APNs registration, upload the Expo push token to the server, and honor the existing push preferences. Until (2) lands, consider hiding or labeling the push toggles as web-only so the settings screen doesn't promise delivery the native app can't make.

**Impact:** Generation is a minutes-long wait — exactly when a push matters most — and social events (follows, comments) are the retention loop; both are silently undeliverable on device, and users have no ambient cue that anything happened.

_Files:_ `apps/mobile/app/(tabs)/(library,playlists,favorites,history,profile)/notification-settings.tsx`, `apps/mobile/src/api/notification-prefs.ts`, `apps/mobile/app.json`, `apps/mobile/package.json`

### [MEDIUM/M] Offline / airplane mode has no affordance and playback fails silently

There is no connectivity awareness anywhere in the app — grep for `NetInfo`/`isConnected`/`offline` across src/ and app/ returns zero. When offline, list screens degrade to the generic 'Network error' EmptyState (recoverable on retry, acceptable), but tapping a song hits the play-on-tap handlers that end in `console.error` only (index.tsx play catch ~210, and the same silent-catch pattern flagged still-open in UX-REVIEW across favorites/history/search/discover/song), so nothing happens on screen and the user taps repeatedly with no feedback. Audio is streamed from remote `song.streamUrl` (audio.ts:260) with no offline-playback story: the only FileSystem caching is waveform peaks (peaks.ts) and share/download-to-cache (song-files.ts) — neither makes the library playable offline. There is no 'You're offline' banner and no downloaded-tracks concept.

**Proposal:** Cheap first step (S): add a lightweight connectivity listener (expo-network / @react-native-community/netinfo) that shows a dismissible 'You're offline' banner and routes play failures through one visible toast ('Couldn't play — check your connection'). Larger, later (L, device-gated): a real 'download for offline' path reusing the existing FileSystem cache. Characterize exact airplane-mode behavior during the device pass before committing to the larger scope.

**Impact:** A music app that goes completely silent-on-tap with no explanation the moment the network drops (subway, plane) reads as broken; the fix for the papercut (banner + visible play-failure) is small and independent of the offline-library ambition.

_Files:_ `apps/mobile/src/playback/audio.ts`, `apps/mobile/app/(tabs)/(library,playlists,favorites,history,profile)/index.tsx`, `apps/mobile/src/api/song-files.ts`

### [MEDIUM/S] App-store submission readiness gaps: no splash asset, mic-permission workaround, empty privacy data types

Concrete gaps that will surface at TestFlight/App Review time. (1) assets/ contains only `icon.png` (185KB) — there is no splash asset and no `expo-splash-screen` config or `splash` key in app.json, so the app launches to a default blank screen. (2) app.json:17 declares `NSMicrophoneUsageDescription` solely because 'the waveform library bundles recording code' — requesting microphone permission with no user-facing mic feature is a recurring App Review rejection trigger and warrants a plan (strings that explain, or dropping the recording code path). (3) PrivacyInfo.xcprivacy declares `NSPrivacyCollectedDataTypes` empty (lines 32-33) while the app records listening history (recordPlay, audio.ts:283) and account data — the App Store Connect privacy nutrition label will still need entries, so this should be reconciled deliberately, not left blank. Version is 0.1.0 / buildNumber 1.

**Proposal:** Add an `expo-splash-screen` config + splash asset matching the DESIGN.md dark-first identity; write a defensible mic-usage string or remove the recording dependency; reconcile the privacy manifest and the App Store Connect data-collection answers against what the app actually sends. Bundle this as a pre-submission checklist to run alongside the device pass and the paid-account step.

**Impact:** These are the difference between 'builds on my device' and 'accepted by App Review'; each is cheap individually but any one can bounce a submission and cost a review round-trip.

_Files:_ `apps/mobile/app.json`, `PrivacyInfo.xcprivacy`

### [LOW/M] The 3 most-used list screens are still off useListResource; a paginated + nullable-success v2 would absorb all 4 stragglers

useListResource now backs 8 list screens, but the three highest-traffic ones — Library (index.tsx), Discover (discover.tsx), Search (search.tsx) — hand-roll their own lifecycle because the v1 hook has no pagination. Each re-implements the very things the hook exists to standardize: the `reqRef` stale-guard, silent focus-revalidate-without-clearing-data, and keep-list-on-refresh. discover.tsx is the clearest tax: `load` (54-74), `revalidate` (81-99) and `onRefresh` (149-166) are three near-identical copies of the same fetchDiscover+guard block in one file; index.tsx repeats the pattern again at 77-160. Inspire (inspire.tsx) is a different mismatch: its successful load can legitimately be `null` (no digest generated yet), but the hook treats `data===null` as not-loaded (useListResource.ts:154 `showError = error && data===null`), so a real 'no digest' result is indistinguishable from loading — and it has a `generate()` mutation that sets data directly. Net: the 4 screens most likely to drift are the 4 off the shared abstraction.

**Proposal:** Yes to a v2. Add a paginated variant (a `getPage(cursor|page)` fetcher + `loadMore`/`hasMore`/`loadingMore` and append semantics) to fold index/discover/search onto one code path, and separate 'loaded' from 'data!==null' (an explicit `loaded` flag / nullable-success) so Inspire can adopt it while keeping the already-present `mutate` for its generate() path. This is maintainability/AI-navigability, not a user-visible bug — rate accordingly.

**Impact:** Operators/AI agents: the pagination-race and focus-revalidate logic is exactly the class of bug the hook was built to make impossible-by-construction, yet the busiest screens each re-derive it, so a fix to one won't propagate and future edits keep re-litigating the same edge cases.

_Files:_ `apps/mobile/src/hooks/useListResource.ts`, `apps/mobile/app/(tabs)/(library,playlists,favorites,history,profile)/index.tsx`, `apps/mobile/app/(tabs)/(library,playlists,favorites,history,profile)/discover.tsx`, `apps/mobile/app/(tabs)/(library,playlists,favorites,history,profile)/inspire.tsx`


## Lens: MCP + Public API

The MCP surface is well-structured (shared registry/handlers across stdio + Streamable-HTTP, origin guard, per-key sliding-window rate limit, bearer auth) and the public share surface is correctly gated — /s/[slug], /api/songs/public, and /embed all enforce isPublic/isHidden/archivedAt, and toggleSongShare invalidates the public cache, so I found no private-field leak worth flagging (creatorUserId is the only internal id exposed, and it's used for profile linking). The highest-leverage fix is operator-facing: every routine 401/403/429 on the public /api/mcp endpoint is captured as a GlitchTip exception with no beforeSend filter, so scanners and polling agents flood error tracking — cheap to silence and it unblocks trustworthy post-deploy triage. The most valuable product gap is that the MCP agent (Ken) can generate but cannot publish or even read a song's share URL, so its output is stranded private. Rounding out: tool arguments are never validated against their declared JSON schemas (the SDK doesn't enforce them and handlers only spot-check presence, inconsistently), a real title-precedence bug in extend_song persists 'null (extended)', personas are advertised but undiscoverable via MCP, and the SKILL.md return-shape docs have drifted from the actual `generationStatus` field.

### [MEDIUM/S] MCP endpoint captures every routine 401/403/429 as a GlitchTip exception

src/app/api/mcp/route.ts is a public internet-facing endpoint that funnels all three reject paths through logServerError: origin-blocked (line 80), invalid/missing bearer (line 94), and rate-limit exceeded (line 107). logServerError unconditionally calls Sentry.captureException (src/lib/error-logger/server.ts:88), and sentry.server.config.ts has no beforeSend/ignoreErrors filter, so each rejection becomes a captured exception event. These are routine, expected outcomes for a bearer-only public endpoint: internet scanners probing /api/mcp, a user with a fat-fingered or revoked key, or — most damaging — an agent polling get_song in a loop that trips the 60 rpm limit. A single misconfigured polling agent (Ken) can emit dozens of 'mcp.rate_limit.exceeded' exceptions per minute, drowning real errors and risking event-frequency alerts (docs/sentry-alerting.md).

**Proposal:** Treat auth/origin/rate-limit rejections as expected control-flow, not exceptions. Keep the pino warn log (logger.warn) for forensics but skip Sentry.captureException for these three sources — e.g. pass a flag to logServerError, or add a beforeSend in sentry.server.config.ts that drops events whose source starts with 'mcp.auth'/'mcp.origin'/'mcp.rate_limit'. Reserve captureException for mcp.handler.error (the genuine 500 path).

**Impact:** Operator: after each deploy the GlitchTip issue list and event quota fill with self-inflicted noise from bots and polling loops, causing alert fatigue and masking real regressions in a closed beta with only a handful of real users.

_Files:_ src/app/api/mcp/route.ts`, src/lib/error-logger/server.ts`, sentry.server.config.ts`

### [MEDIUM/M] No way to publish or share a song through MCP — Ken's output is stranded private

The web app can toggle a song public and mint a shareable /s/{slug} link (src/lib/songs/crud.ts:180 toggleSongShare → returns {isPublic, publicSlug}; exposed at src/app/api/songs/[id]/share/route.ts). None of the 16 MCP tools expose this: there is no make_public / share tool, and get_song's select (mcp/tools/get_song.ts:33-50) omits isPublic and publicSlug entirely. So an agent that generates via MCP has no way to publish a finished track or even discover its public URL — the very artifact a generation agent exists to produce cannot be shipped without a human opening the web UI.

**Proposal:** Add a share_song(songId) tool wrapping toggleSongShare that returns the canonical /s/{slug} URL, and add isPublic + publicSlug (and the derived share URL) to get_song's output so agents can read current share state. Document both in skills/sunoflow/reference/tools.md.

**Impact:** Product/agent capability: closes the loop for the Paperclip agent (Ken) — generated songs become linkable deliverables instead of dead rows only visible in the owner's private library.

_Files:_ mcp/tools/get_song.ts`, src/lib/songs/crud.ts`, src/app/api/songs/[id]/share/route.ts`

### [MEDIUM/M] Tool arguments are never validated against their declared JSON schemas

Tools declare rich inputSchema constraints (enum, minimum/maximum, maxLength), but the low-level SDK Server used in register-handlers.ts:40-55 only validates the CallTool envelope, not per-tool argument schemas. Handlers then cast `input as {...}` and spot-check presence only. generate_song (mcp/tools/generate_song.ts:106-123) checks that prompt is non-empty and nothing else: styleWeight/weirdnessConstraint/audioWeight ranges (0–1), the model enum (V4/V4_5/V5/V5_5), vocalGender (m/f), and the 5000-char prompt cap are all unenforced and forwarded straight into generateSong → the paid Suno API. extend_song validates only songId. Validation is also inconsistent — create_playlist (mcp/tools/playlist.ts:44) does manually enforce its maxLength, so the codebase disagrees with itself. An agent passing styleWeight: 50 or model: 'V9' burns a credit-costing round-trip that fails opaquely inside Suno.

**Proposal:** Add a single validation seam at the CallTool dispatch in register-handlers.ts: give each registered tool a zod schema (or run ajv against the existing inputSchema) and reject with a clear MCP error before the handler/credit-check runs. This is also the natural home for the DTO-schemas-in-core work already on the backlog.

**Impact:** Users/agents: out-of-range or wrong-enum inputs waste credits and surface as confusing downstream Suno errors instead of an immediate, actionable 'styleWeight must be 0–1'. Centralizing it removes the per-tool ad-hoc checks.

_Files:_ src/lib/mcp/register-handlers.ts`, mcp/tools/generate_song.ts`, mcp/tools/extend_song.ts`, mcp/tools/playlist.ts`

### [MEDIUM/S] extend_song stores the wrong title — operator-precedence bug discards the caller's title

mcp/tools/extend_song.ts:153 sets `title: cleanTitle ?? parentSong.title ? `${parentSong.title} (extended)` : null`. Because ?? binds tighter than the ternary, this parses as `(cleanTitle ?? parentSong.title) ? '<parent> (extended)' : null`, so a caller-supplied title is thrown away: it always writes '<parentTitle> (extended)'. Worse, when the parent has no title but the caller does pass one, the branch still evaluates the template against the null parent title and stores the literal string 'null (extended)'. Note cleanTitle IS passed correctly to the Suno call on line 137, so the persisted DB row disagrees with what was actually generated.

**Proposal:** Parenthesize the intended precedence: `title: cleanTitle ?? (parentSong.title ? `${parentSong.title} (extended)` : null)`. Add a unit test covering (a) caller title honored, (b) parent-derived fallback, (c) neither present → null.

**Impact:** Users: extensions created via MCP show a wrong or literally 'null (extended)' title in the library until (and unless) a later poll overwrites it, undermining any agent that names its extensions.

_Files:_ mcp/tools/extend_song.ts`

### [LOW/S] Personas are usable in generate_song but undiscoverable through MCP

generate_song advertises personaId and personaModel (mcp/tools/generate_song.ts:47-55), and the param description literally says 'Get IDs from your persona list' — but MCP exposes no persona-list tool and no sunoflow://personas resource. The capability exists on the web (src/app/api/personas/route.ts), so an agent can only use a persona if a human pastes an opaque ID out of the browser. The parameter is effectively dead for autonomous use.

**Proposal:** Add a list_personas tool (or a sunoflow://personas resource) returning {id, name, personaModel} scoped to the user, mirroring the existing personas route. Cheap, and it makes the already-shipped personaId param actually reachable.

**Impact:** Agents: voice/style persona reuse — a headline Suno feature — is inaccessible to the MCP agent without out-of-band human help.

_Files:_ mcp/tools/generate_song.ts`, src/app/api/personas/route.ts`

### [LOW/S] SKILL.md tool reference drifts from actual return shapes

The canonical agent-facing doc misstates return contracts. skills/sunoflow/reference/tools.md:7 and :85 tell agents generation tools return `{ status: 'pending', … }`, but generate_song actually returns `{ songId, generationStatus, title }` (mcp/tools/generate_song.ts:196) and extend_song returns `{ songId, generationStatus, parentSongId }` — there is no `status` field, it's `generationStatus`. Separately, tools.md:334 claims 'sunoflow_info reports the active default model if relevant', but info.ts returns only version + the tool list (mcp/tools/info.ts:16-23) with no default-model field. An agent coded against the doc will read undefined for both.

**Proposal:** Align the doc with reality: document the `generationStatus` field name in the conventions section and per-tool return examples, and either drop the sunoflow_info default-model claim or add a defaultModel field to info.ts to make it true.

**Impact:** Agents: brittle integrations that branch on a non-existent `status` field or expect a default-model probe that returns nothing; wasted debugging for anyone building against the SKILL.

_Files:_ skills/sunoflow/reference/tools.md`, mcp/tools/generate_song.ts`, mcp/tools/info.ts`


## Lens: Observability + Ops

SunoFlow's web observability is genuinely solid — pino structured logging is used consistently (only ~21 console.* sites in src, mostly admin/UI), logServerError correctly promotes searchable tags to GlitchTip, replayIntegration is properly omitted for GlitchTip portability, and instrumentation.ts carefully gates Sentry on DSN presence. The gaps are at the edges and in the operations layer. The single highest-leverage move: make the 2026-07-17 self-heal paths emit a countable signal (a derived-cdn fallback counter surfaced in /api/health) and teach the one automated monitor (uptime-monitor.yml) to inspect the job/generation health that /api/health already exposes — together they turn the next aggregator host death from a reactive log-grep into a proactive alert. Beyond that, the mobile app has zero crash telemetry right as it heads to real devices, two cron routes (RSS auto-gen, embeddings) have no in-repo trigger and no run-history anywhere, and the circuit-recovery drain path is the one generation site that skips GlitchTip. None of these are re-treads of the already-done work; all are concrete and cheap relative to their operator pain.

### [HIGH/M] Mobile app ships to devices with zero crash/error telemetry

The Expo app has no error tracking of any kind. apps/mobile/package.json (deps lines 16-42) contains no @sentry/* / glitchtip / crashlytics dependency, and a repo-wide grep for sentry|glitchtip|captureException|ErrorBoundary|ErrorUtils over apps/mobile returns nothing. The root layout apps/mobile/app/_layout.tsx has no React error boundary, and its one caught error is swallowed to the RN console: `.catch((e) => console.error("[auth] key check failed", e))` at _layout.tsx:73. This is in stark contrast to the web app, which has full GlitchTip wiring (sentry.client.config.ts + sentry.server.config.ts + instrumentation.ts) plus global-error.tsx and 9 route-level error.tsx boundaries. With the device pass pending, the app is about to run on real iOS devices where a JS crash or failing API call produces no signal the operator can ever see.

**Proposal:** Wire a Sentry-protocol client into the mobile app pointed at the same GlitchTip host (the web already proves GlitchTip accepts the error envelope; keep replayIntegration off as the web configs already document). Add an expo-router root ErrorBoundary in app/_layout.tsx that reports to it, and replace the silent console.error swallows with a capture call. Even a thin fetch-to-DSN wrapper (no native module) would surface white-screen crashes and auth/API failures from beta testers' devices.

**Impact:** Operator and the handful of beta users: the first on-device crash wave after the device pass will be invisible; you'll learn about it only when a tester complains, with no stack trace, breadcrumb, or affected-user count.

_Files:_ apps/mobile/package.json`, apps/mobile/app/_layout.tsx`, sentry.client.config.ts`

### [HIGH/S] CDN self-heal fallbacks emit no countable signal — the next aggregator death repeats 2026-07-17 blind

The 2026-07-17 self-heal chain heals dead aggregator (tempfile.*) URLs by refreshing from the aggregator and then deriving Suno's permanent cdn1 URL, but it announces itself only through scattered logger.warn calls: audio/index.ts:89 ("upstream failed, forcing refresh"), audio/index.ts:115 ("falling back to derived cdn url"), and asset-refresh.ts:120/163/167. None of these increment a counter: src/lib/metrics.ts tracks routes, generation totals, and cache hits/misses but has no field for heals or derived-cdn fallbacks, so /api/health and /api/metrics show nothing. Because they are `warn` (not captureException), GlitchTip never sees them either, and uptime-monitor.yml:55 only inspects `.status == "ok" and .db == true`. The exact event that spiked to 114 songs during the incident — dead origin forcing the cdn1 derivation — is precisely the early-warning signal, and it is dropped on the floor. Noticing the next host death still requires a human to grep Railway stdout for the warn string.

**Proposal:** Add a `recordSelfHeal(kind)` counter to metrics.ts incremented at audio/index.ts:114 (derived-cdn fallback) and the forced-refresh at :88, then surface a `selfHeal: { derivedCdnFallbacks, forcedRefreshes }` block in the /api/health snapshot. Extend uptime-monitor.yml's jq assertion (or a second scheduled check) to alert when the fallback rate over the window jumps above a small baseline. That converts the incident from reactive (grep after users complain) to proactive.

**Impact:** Operator: the next aggregator host expiry becomes a dashboard/alert spike caught in minutes instead of a silent audio-404 wave discovered by users hours later.

_Files:_ src/lib/audio/index.ts`, src/lib/songs/asset-refresh.ts`, src/lib/metrics.ts`, src/app/api/health/route.ts`

### [MEDIUM/S] RSS-auto-gen and embedding cron routes have no in-repo trigger and no run-history anywhere

Three cron endpoints exist under src/app/api/cron/ (feed-auto-generate, generate-embeddings, refresh-smart-playlists), and incident-response.md:145 states they depend on a "Railway cron trigger" — but no such trigger exists anywhere in the repo. The only scheduled GitHub workflows are db-backup.yml (0 1 * * *) and uptime-monitor.yml (*/5 * * * *); railway.toml has no cron config. Only refresh-smart-playlists is redundantly covered by the in-process node-cron scheduler (JOB_DEFINITIONS in jobs/job-definitions.ts:60 registers `smart-playlist-refresh`). feed-auto-generate and generate-embeddings are NOT in JOB_DEFINITIONS, so if the dashboard-only Railway trigger is absent or its CRON_SECRET drifts, RSS feed auto-generation and new-song embeddings silently stop. Critically, /api/health's `jobs` array (health/route.ts:27) reflects only the 5 in-process scheduler jobs — it has zero visibility into whether these 3 HTTP routes ever ran, so even a manual health check can't tell you embeddings have been dead for a week (degrading semantic search/recommendations over the ~480-song library).

**Proposal:** Either register feed-auto-generate and generate-embeddings as in-process jobs in JOB_DEFINITIONS (so they auto-run and appear in /api/health's jobs array like the others), or add a GitHub Actions cron mirroring uptime-monitor.yml that POSTs each endpoint with CRON_SECRET and fails loudly on non-200. Both close the observability hole; the first also removes the dependency on undocumented dashboard state.

**Impact:** Operator/users: a whole feature (RSS auto-gen) or search quality (embeddings) can degrade to zero with no signal on any dashboard; recommendations quietly rot as new songs never get embedded.

_Files:_ src/app/api/cron/generate-embeddings/route.ts`, src/app/api/cron/feed-auto-generate/route.ts`, src/lib/jobs/job-definitions.ts`, src/app/api/health/route.ts`, docs/incident-response.md`

### [MEDIUM/S] The only automated alert ignores the job-health and generation-staleness data health already exposes

/api/health already computes everything needed for meaningful alerting — jobs[].lastRun.success/error (health/route.ts:32-38) and generation.lastSuccessfulGenerationAt (health/route.ts:25) — but the sole automated monitor, uptime-monitor.yml, asserts only `.status == "ok" and .db == true` (uptime-monitor.yml:55). As long as the DB answers SELECT 1, health returns 200 and the monitor stays green even if a scheduler job has failed every night for a week or zero songs have generated successfully for hours (aggregator down). The incident-response runbook's step 1 ("check /api/health jobs array for lastRun.success:false") is therefore a purely manual action nothing performs. Railway's healthcheck (railway.toml healthcheckPath) similarly only restarts on a hard failure.

**Proposal:** Extend the jq check in uptime-monitor.yml to also fail when any jobs[].lastRun.success === false, and (optionally) when generation.lastSuccessfulGenerationAt is older than a threshold during expected-traffic hours. Zero new infra — it reuses the payload already served.

**Impact:** Operator: silent recurring job failures and generation-pipeline stalls become paging alerts instead of things discovered days later by manually curling health.

_Files:_ .github/workflows/uptime-monitor.yml`, src/app/api/health/route.ts`, docs/incident-response.md`

### [MEDIUM/S] Circuit-recovery queue-drain failures bypass GlitchTip (logger.error only)

When the circuit breaker opens, generations are queued and later retried by drainQueuedItems(). On an api_error outcome the drain path logs only to pino/Railway stdout — generation-queue/drain.ts:74-78 does `logger.error({ err: outcome.rawError }, ...)` and then writes status=failed at drain.ts:79 — with no logServerError call. Every sibling path does the right thing: the interactive HTTP queue path calls logServerError("queue-process", ...) at process-next.ts:65, and the direct generate path calls it via respond.ts:24. This is exactly the memory rule violation (a status=failed write after the generateSong external call that never reaches the aggregated error tracker), and it is the worst place to be blind: the drain runs precisely when the aggregator is recovering from an outage, so these are the failures you most want in GlitchTip with searchable songId/queueItemId tags to judge whether recovery actually took.

**Proposal:** In drain.ts's `case "api_error"`, call logServerError("queue-drain", outcome.rawError, { userId: item.userId, route: "generation-queue/drain", params: { queueItemId: item.id, songId: outcome.song.id } }) alongside the existing logger.error, matching process-next.ts.

**Impact:** Operator: post-outage recovery failures are invisible in GlitchTip, so you can't tell a clean recovery from a still-broken aggregator without grepping raw logs.

_Files:_ src/lib/generation-queue/drain.ts`, src/lib/generation-queue/process-next.ts`

### [LOW/M] File cache grows unbounded on a fixed Railway volume with no disk monitoring or eviction

src/lib/cache/file.ts (212 lines) writes audio/image blobs to disk with no size cap, no LRU/eviction, and no ENOSPC handling — a grep for evict|maxBytes|capacity|prune finds none. The cache dirs are fixed-size Railway volumes (railway.toml documents /data/audio-cache and /data/image-cache mounts). The admin mirror-health route (admin/mirror-health/route.ts) does compute totalBytes per dir, but it's an admin pull-only endpoint, is never compared against volume capacity, and nothing polls it. At ~480 songs this is comfortably within budget, but growth is monotonic; a full volume would make audioCache.put/downloadAndPut fail while proxyAudio silently keeps serving from origin — a quiet latency/cost regression with no alert.

**Proposal:** Add a periodic disk-usage gauge (bytes used vs volume size) to the metrics snapshot / a scheduler job, alert past a threshold (e.g. 80%), and add a simple size-bounded eviction (oldest-first) to the file cache so it self-caps rather than filling the volume. Low urgency at current scale but cheap insurance before the library grows.

**Impact:** Operator: unbounded growth on a fixed volume is a latent silent-degradation risk; today it's invisible because nothing watches disk usage against capacity.

_Files:_ src/lib/cache/file.ts`, src/app/api/admin/mirror-health/route.ts`, railway.toml`


## Lens: Testing

Testing is broad and disciplined at the unit layer — 208 vitest files, a real-Postgres Playwright suite in CI (ci.yml runs `pnpm test:e2e` plus an e2e-staging job on main), and the register/invite-gate and generate submit paths are genuinely well covered. The single highest-leverage gap is billing: src/lib/billing/checkout.ts (11KB — checkout, cancel, invoices) has zero lib tests and its route tests fully mock the delegate and re-assert canned returns, so the entire real-money mutation surface is untested-but-green. That same recorded-wiring-trap pattern (route tests mocking the one dependency they exist to exercise) recurs across the billing route family. Beyond billing, mashup is untested top-to-bottom (paid mode, only a smoke page-load), the e2e playlist mutations mock their own writes (and the 'remove song' test is hollow — it asserts an empty state instead of removing), the mobile playback glue that holds this week's double-skip guard has no runner at all, and the agentic UX test is silently skipped every CI run. Fixing billing first — add a checkout.test.ts that runs the real logic against a mocked Stripe client — closes the costliest blind spot.

### [HIGH/M] Billing business logic (checkout.ts) is untested — the route tests only re-assert their own mocks

src/lib/billing/checkout.ts (11KB) holds the entire money-mutation surface — createCheckoutSession (tier validation, same-plan detection, upgrade-vs-new-subscription branching, Stripe proration), cancelSubscription, and getInvoices — and has NO test file. grep for each function across src/lib/**/*.test.ts returns 0 files. The only 'coverage' is the route tests, and they are the recorded-wiring-trap in its purest form: src/app/api/billing/checkout/route.test.ts mocks createCheckoutSession entirely and every case hard-codes the mock's return (e.g. the 'returns 400 when tier is invalid' test passes tier:'enterprise' but the mock ignores the input and returns a canned {status:400,code:'VALIDATION_ERROR'}). So the tier whitelist, the SAME_PLAN guard, and the proration path are asserted against fabricated values, never executed. The same shape repeats for billing/cancel, billing/topup, billing/invoices, billing/portal (all delegate to untested lib fns). Note vitest.config.ts already lists these under coverage all:true, so checkout.ts shows as a visible coverage hole. This is the opposite of the good pattern the team established for the auth/token route (M004-S02: run the REAL publicRoute wrapper, mock only env/auth/prisma).

**Proposal:** Add a checkout.test.ts that exercises createCheckoutSession/cancelSubscription against a mocked Stripe client + prisma (the pattern already exists in src/lib/billing/webhook.test.ts) so tier validation, same-plan rejection, and the upgrade-proration branch are actually run. Leave the route tests as thin 200/4xx passthrough checks. This converts ~5 tautological cases into real coverage of the paid path.

**Impact:** Operators/users on the live Stripe surface: a regression in tier validation, proration, or same-plan detection would ship green — meaning failed upgrades, wrong charges, or double-billing that no test can catch.

_Files:_ `src/lib/billing/checkout.ts`, `src/app/api/billing/checkout/route.test.ts`, `src/lib/billing/index.test.ts`

### [MEDIUM/M] Mashup (a top-level app mode + paid Suno op) is untested top-to-bottom

Mashup is Journey 5 in JOURNEYS.md and a first-class mode, yet it has zero real test coverage at any layer. src/lib/mashup/index.ts (4.9KB, executeMashup) has no test (grep executeMashup in *.test.ts = 0). /api/mashup/route.ts has no colocated route.test.ts. The only e2e touch is e2e/smoke.spec.ts asserting '/mashup page loads without crash'. So the two-track combination logic, credit deduction, and the generationOutcomeToResponse wiring in the route are never exercised. There IS a packages/core mashup.test.ts, but that covers shared request/coerce helpers, not the server-side executeMashup orchestration.

**Proposal:** Add a unit test for executeMashup (mock sunoapi + prisma + credits, mirroring generate/route.test.ts) covering: valid two-track submit → pending song + credit deduct, missing/invalid track → 400, Suno error → failed record. Optionally one functional e2e that submits the mashup form with mocked generate.

**Impact:** Users lose credits on a mode whose orchestration can silently break; because it is a paid path with no test, a regression only surfaces as a user-reported failed mashup + burned credits.

_Files:_ `src/lib/mashup/index.ts`, `src/app/api/mashup/route.ts`, `e2e/smoke.spec.ts`

### [MEDIUM/S] E2E playlist-mutation tests never verify persistence; the 'remove song' test is hollow

CI runs Playwright against a real Postgres (ci.yml lines 14-33, 120-124), so playlist writes could be verified for real — but the specs mock them away. In e2e/playlists.spec.ts the 'add a song to a playlist from library' test mocks its own POST **/api/playlists/*/songs to return a canned 201 (lines 140-150), so it only proves the UI fires a request and shows a toast — not that the song lands in the playlist. Worse, 'remove a song from playlist detail view' (lines 170-201) registers a DELETE mock but then, because the freshly-created playlist is empty, just asserts the empty-state text 'No songs yet' (line 198) — it never removes a song despite its name. Net: no e2e proves a song actually enters or leaves a playlist, one of the top user journeys.

**Proposal:** Convert the add/remove playlist tests to a real round-trip against the seeded DB: create a real song via the test/login-seeded user (or the existing generate mock that persists), add it through the UI without mocking the POST, then reload and assert it appears; then remove it and assert it disappears. Delete the misleading empty-state assertion in the remove test.

**Impact:** A regression in playlist add/remove persistence — a core, frequently-used flow — would pass CI, surfacing only when a real user's playlist silently fails to save.

_Files:_ `e2e/playlists.spec.ts`

### [MEDIUM/M] Mobile playback glue (audio.ts, ~438 lines incl. the double-skip guard) has no test runner

apps/mobile has 146 TS/TSX source files and 0 test files — no runner configured (package.json scripts stop at typecheck/lint). packages/core now holds the pure, tested queue reducer (queue.test.ts covers advanceSettled/skipToNext/detectEnded/cycleRepeat), but the risky part lives in mobile-only glue that core cannot cover: apps/mobile/src/playback/audio.ts wires the reducer to expo-audio and contains the exact double-skip guard fixed this week — the in-flight 'advanceStartedAt' timestamp (lines 71-78), polling-driven end-detection + auto-advance (startPolling), the per-tick next/prev re-assertion against expo-audio's reconfiguration (lines 145-199), and recordPlay wiring. grep confirms advanceStartedAt/double-skip exist only in mobile audio.ts, not in core. This is precisely where the double-skip bug recurred, and there is no regression guard.

**Proposal:** Stand up a vitest project inside apps/mobile (node env, mock expo-audio + expo-secure-store) and add focused tests for audio.ts: end-detection does NOT auto-advance while a load is in-flight (double-skip guard), auto-advance honors repeat mode at end-of-queue, and remote next/prev route to the queue. The shared @sunoflow/core parts stay tested where they are.

**Impact:** Playback churn/double-skip is the mobile bug class that already bit users once; with no runner, the next reintroduction ships to the device with nothing to catch it.

_Files:_ `apps/mobile/src/playback/audio.ts`, `apps/mobile/src/playback/usePlayback.ts`, `apps/mobile/package.json`

### [LOW/S] Audio-proxy route's ownership scope and self-heal wiring are untested (post-incident blind spot)

The proxyAudio library self-heal (derived-CDN fallback + row heal) is well covered by src/lib/audio/proxy-fallback.test.ts, but the route that feeds it is not. src/app/api/audio/[songId]/route.ts has no route.test.ts. Its security-relevant line — prisma.song.findFirst({ where: { id: songId, userId: auth.userId } }) (lines 12-13) — plus the null-audioUrl→404 branch and the param wiring into proxyAudio (audioUrlExpiresAt, parentSunoJobId, resolveApiKey, range header) are never asserted. Given this week's DB audio-URL incident and the self-heal work, a regression that drops the userId scope (cross-user audio leak) or mis-wires the expiry/parent fields would not be caught.

**Proposal:** Add a small route.test.ts: song owned by another user → 404 (proves userId scoping), song with null audioUrl → 404, happy path → proxyAudio called with the exact field mapping (mock proxyAudio and assert its args). Cheap and directly guards the incident surface.

**Impact:** An ownership-scope regression here is a cross-user audio-content leak; the expiry/parent-mapping is what the self-heal depends on — both currently ride on manual review only.

_Files:_ `src/app/api/audio/[songId]/route.ts`, `src/lib/audio/proxy-fallback.test.ts`

### [LOW/S] The agentic UX smoke test is collected but silently skipped on every CI run

e2e/agentic/sunoflow.agentic.spec.ts is a genuinely valuable LLM-driven flow-defect finder, but its beforeAll (lines 51-65) calls test.skip when no LLM endpoint at cfg.baseUrl is reachable, and .github/workflows/ci.yml provides no LLM_BASE_URL/LLM_MODEL to the E2E step (grep 'LLM' in ci.yml = none). Since it lives under e2e/ (playwright testDir), CI's `pnpm test:e2e` collects it and then skips both persona tests every run. So it only ever executes when a human runs it locally against Ollama/llm.yester.cloud — meaning it can bit-rot (selector drift, harness breakage) with nothing to signal it, and its findings never inform CI.

**Proposal:** Either point a nightly/scheduled CI job at llm.yester.cloud (the gateway is already used elsewhere in this org) so the harness itself is exercised on a cadence, or move it out of the default e2e testDir into a clearly manual `pnpm test:agentic` so its zero-run-in-CI status is explicit rather than a silent skip.

**Impact:** A tool built to catch UX regressions provides false comfort — it shows as part of the e2e suite but contributes zero signal in CI and can quietly stop working.

_Files:_ `e2e/agentic/sunoflow.agentic.spec.ts`, `.github/workflows/ci.yml`


## Lens: Data Layer

The data layer is in solid shape: backups are genuinely automated (db-backup.yml cron `0 1 * * *` with a verified sidecar restore), archivedAt is honored consistently across public/feed/library/embedding queries, cascade rules are mostly deliberate, and Session/RateLimit have retention jobs. The single highest-leverage fix is making CDN freshness host-aware: after the 2026-07-17 cdn1 migration the permanent `cdn1.suno.ai` URLs are still treated as expirable (null or a synthetic 12-day TTL, and null == always-stale), so the every-boot cache warmup re-refreshes ~80% of the catalog against the flaky Suno aggregator one row at a time with 1s delays — the field `audioUrlExpiresAt` no longer means anything for the majority of rows. Secondary structural risks: a required-FK Cascade on PlaybackState.songId that wipes a user's whole player session when any cued song is deleted, and a per-boot `migrate resolve --rolled-back` drift hack with no CI drift detection. Lower-severity items are missing retention on append-only analytics/error tables, Song over-indexing that defeats HOT updates on the poll/play hot paths, and unguarded embedding-JSON casts. Severities are rated honestly for the current ~480-song, handful-of-users scale — the index/retention items are slow-burn, the cdn1 and cascade items bite now.

### [HIGH/S] cdn1 permanent URLs are stamped with a 12-day TTL (or null), so the self-heal re-refreshes ~80% of the catalog against the aggregator on every boot

After the 2026-07-17 cdn1 migration, most rows carry a permanent `cdn1.suno.ai/<clipId>.mp3` audioUrl, but the freshness model has no concept of a permanent URL. `audioUrlExpiresAt` is either null (the completion path sets it unconditionally to null at src/lib/generation/completion.ts:194) or a synthetic `now + 12d` stamp written by the heal (src/lib/songs/asset-refresh.ts:159). Both freshness checks treat these as stale: `isFresh(null)` returns false (src/lib/cache/warmup.ts:13-16) and `isExpired` is true when the timestamp is null or within the 3-day threshold (src/lib/audio/index.ts:66-71) — neither is host-aware even though `SUNO_CDN_BASE`/`sunoCdnAudioUrl` already exist (src/lib/sunoapi/mappers.ts:25-34). `warmUpAudioCache` runs on every server start (src/instrumentation.ts:37-41) and, for each of the ~391 non-fresh rows, skips the direct download fast-path and instead does a `refreshSongCdnUrls` aggregator round-trip followed by a hard-coded 1000ms delay (warmup.ts:62,80-99,127) — roughly 6+ minutes of warmup and ~391 aggregator calls per redeploy, and Railway auto-deploys `main` frequently. Each cold-cache play of those songs also forces a pre-fetch refresh. This is precisely the aggregator dependency whose flakiness caused the original incident, so `audioUrlExpiresAt` is no longer meaningful for cdn1 rows: it can't say 'permanent, never refresh'.

**Proposal:** Make the freshness checks host-aware: treat any audioUrl under `cdn1.suno.ai` as permanent (fresh regardless of `audioUrlExpiresAt`) in both `isFresh` (warmup.ts) and `isExpired` (audio/index.ts), and in warmup prefer the direct `downloadAndPut` of the existing cdn1 URL before any aggregator refresh. Optionally stamp cdn1 heals with a null/sentinel expiry and reinterpret null-with-cdn1 as permanent. This removes the per-boot aggregator storm and first-play latency for the bulk of the catalog.

**Impact:** Operator: every redeploy hammers the Suno aggregator ~391 times and adds minutes to warmup, risking the circuit breaker the heal path depends on. Users: first play of ~80% of songs waits on an avoidable aggregator round-trip.

_Files:_ `src/lib/cache/warmup.ts`, `src/lib/audio/index.ts`, `src/lib/songs/asset-refresh.ts`, `src/lib/generation/completion.ts`, `src/instrumentation.ts`

### [MEDIUM/S] Deleting a song cascade-wipes the owner's entire PlaybackState (queue, position, volume, EQ), not just that track

`PlaybackState.songId` is a required column with `onDelete: Cascade` (prisma/schema.prisma:818,832). Because the row keys the user's whole player session (queue JSON, position, volume, shuffle/repeat, EQ gains/speed/pitch), a hard delete of whatever song happens to be `PlaybackState.songId` removes the *entire* row via cascade — the user silently loses their saved queue and audio settings. This is reachable: admin moderation hard-deletes any reported song (`prisma.song.delete` at src/lib/moderation/index.ts:76), and users permanently delete their own archived songs in bulk (`prisma.song.deleteMany` at src/lib/songs/batch.ts:156). Moderating one user's song can therefore clobber another user's playback state if they were cued to it.

**Proposal:** Make `songId` nullable with `onDelete: SetNull` (or delete only the pointer and keep the session), and have the client treat a null current song as 'nothing loaded' while preserving queue/volume/EQ. Alternatively, on song delete, reassign `PlaybackState.songId` to the next queue entry instead of cascading.

**Impact:** Users lose their entire saved player state (queue + EQ + volume) when a single cued song is deleted — including cases triggered by an admin deleting someone else's song.

_Files:_ `prisma/schema.prisma`, `src/lib/moderation/index.ts`, `src/lib/songs/batch.ts`

### [MEDIUM/M] Production boots on a hard-coded per-boot `migrate resolve --rolled-back` drift hack, and CI has no drift detection

Every production container start runs `prisma migrate resolve --rolled-back 20260322200000_add_missing_schema_objects` before `migrate deploy` (docker-entrypoint.sh:74-82). That migration is itself a drift-repair file full of `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` / guarded `ADD CONSTRAINT` (prisma/migrations/20260322200000_add_missing_schema_objects/migration.sql) — a tell that the schema was reconciled after `db push`-style divergence. The entrypoint permanently marks a real, applied migration as rolled-back on every boot so it re-applies idempotently; this is fragile (depends on that SQL staying fully idempotent forever) and adds boot latency. Meanwhile the CI gate `scripts/check-migration-safety.sh` only runs `prisma validate` + name/`migration.sql` structure + a destructive-SQL grep (lines 20-69) — it never runs `prisma migrate status`/`migrate diff` against production, so actual schema drift between the DB and the migration history is undetected.

**Proposal:** Retire the boot-time resolve: verify prod `_prisma_migrations` state once, `migrate resolve` it manually if needed, then delete the hack from docker-entrypoint.sh so boots run a plain `migrate deploy`. Add a `prisma migrate status` (or `migrate diff --exit-code` DB-vs-migrations) step to the deploy workflow so drift fails CI instead of being silently papered over at runtime.

**Impact:** Operator: a fragile, invisible workaround runs on every deploy; real schema drift can slip into prod undetected until a query fails.

_Files:_ `docker-entrypoint.sh`, `scripts/check-migration-safety.sh`, `prisma/migrations/20260322200000_add_missing_schema_objects/migration.sql`

### [MEDIUM/S] Append-only analytics / notification / error tables have no retention job while Session and RateLimit do

The scheduler cleans Session and RateLimit/AnonRateLimit rows on daily crons (src/lib/jobs/job-definitions.ts:14-38,63-64), but the other unbounded, append-only tables have no retention policy: `PlayEvent` and `SongView` (one row per play/view), `PlayHistory`, `Activity`, `Notification` (read rows never pruned), and `ErrorReport` (one row per client error, no user FK, no cleanup — schema.prisma:602-613). At ~480 songs and a handful of users these grow slowly today, but ErrorReport in particular can balloon from a single client error storm or bot, and every one of these bloats the daily pg_dump backup artifact (docs/backup-runbook.md warns about the 2 GB artifact ceiling). The cleanup pattern already exists; it just isn't applied to the high-cardinality tables.

**Proposal:** Add retention jobs mirroring `rateLimitEntryCleanup`: prune `PlayEvent`/`SongView`/`ErrorReport` older than N days (e.g. 90), cap `Notification` (delete read rows older than 30d), and trim `Activity`/`PlayHistory` beyond a rolling window. Keep aggregates in the analytics snapshot if long-term counts are needed.

**Impact:** Operator: unbounded table growth silently inflates backups and query cost over time; an error storm can bloat ErrorReport with no self-healing.

_Files:_ `src/lib/jobs/job-definitions.ts`, `prisma/schema.prisma`, `docs/backup-runbook.md`

### [LOW/S] Song carries 21 indexes, defeating HOT updates on its hottest write paths (generation polling, playCount)

The Song model declares 21 `@@index` plus 2 unique constraints (prisma/schema.prisma:206-226) — 123 indexes exist schema-wide. Song is also the most-updated table: generation polling repeatedly rewrites `generationStatus`/`pollCount`, `updatedAt` changes on every write, and `playCount` increments on every play (src/app/api/songs/[id]/play/route.ts:28, src/lib/analytics-data/tracking.ts:43, src/lib/playlists/publish.ts:163). Because `generationStatus` (4 indexes), `updatedAt`, and `playCount` (2 indexes) are all indexed, Postgres can't take the HOT-update fast path on essentially any Song write, so every status poll and every play maintains multiple B-trees. Several of these indexes are low-value at this scale — per-user vanity sorts like `[userId, tempo]`, `[userId, downloadCount]`, `[userId, source]`, `[userId, rating]`, `[userId, isFavorite]` over a tiny per-user row set that a plain `[userId, createdAt]` scan already covers.

**Proposal:** Drop the low-selectivity single-user sort indexes (tempo/downloadCount/source/isFavorite and likely rating) and reassess `[userId, updatedAt]` vs write cost; keep the discovery and status indexes. This reduces write amplification on the poll/play hot paths and shrinks the schema's index footprint.

**Impact:** Operator: extra index maintenance on the busiest write paths and larger dumps/indexes, for indexes that buy nothing at current row counts.

_Files:_ `prisma/schema.prisma`, `src/app/api/songs/[id]/play/route.ts`

### [LOW/S] Embedding JSON vectors are cast to number[] without a real shape guard, and one path bypasses the guard entirely

`SongEmbedding.embedding` is an untyped Json column (prisma/schema.prisma:929). The 'guarded' reader `parseEmbeddingVector` only checks Array + non-empty and then does `return raw as number[]` (src/lib/embeddings/index.ts:130-133) — it never validates element type or dimension, so a row containing strings/nulls flows straight into `cosineSimilarity`, producing silent NaN scores. Worse, `src/lib/smart-playlists/compute.ts:116,130` skips the guard and casts `sourceEmb.embedding as unknown as number[]` / `c.embedding as unknown as number[]` directly, so a null or non-array embedding would throw (`.length` on undefined) rather than degrade gracefully. The two code paths disagree on how the same JSON column is validated.

**Proposal:** Harden `parseEmbeddingVector` to verify every element is a finite number and the length matches `EMBEDDING_DIMENSIONS`, returning null on mismatch, and route `smart-playlists/compute.ts` through it instead of casting. This makes malformed embedding rows a no-op instead of a NaN recommendation or a throw.

**Impact:** Developer/operator: a single malformed embedding row silently corrupts recommendation scores or crashes smart-playlist computation, with no shared validation seam.

_Files:_ `src/lib/embeddings/index.ts`, `src/lib/smart-playlists/compute.ts`, `prisma/schema.prisma`


## Lens: Product Gaps

Against the project's own locked docs, SunoFlow's product IA has drifted from its plan: the M001 follow-up roadmap that would have delivered the \"three equal modes\" experience (M002 Generate redesign, M003/M004 IA consolidation) was superseded by the MCP-server and monorepo/mobile milestones, so decisions D3-D14 remain unimplemented and the web app is still the ~20-route, 17-flat-nav sprawl JOURNEYS audited in June. Two JOURNEYS findings are genuinely fixed in code (library empty-state now exists; the dual A/B shell is unified under AppShell), but the other five are open. Per mode: BROWSE/Discover still ships the banned \"Made for you\" auto-playlist rails and duplicate /discover=/explore routes; GENERATE landed its internal refactor (30→7 useState) but not the user-facing progressive-disclosure/persona-first workflow that was the point; EDIT is paywall-locked (mashup→starter, vocal-sep→pro) for a 100%-free closed beta with no bypass, contradicting \"three first-class modes\"; and the locked DESIGN.md brand (Electric Magenta, dark-first) applies to zero screens (1726 violet utilities, 0 magenta tokens). The single highest-leverage move is the cheapest: unlock Edit for the beta circle (a small feature-gate/beta-grant change) so the advertised third mode actually works, then run the deferred M002 UX half and the frontend-only IA consolidation wave.

### [HIGH/S] Edit mode is paywall-locked for the entire free closed beta, breaking the "three equal modes" promise

PRODUCT.md line 18: "The product must make all three [Browse/Generate/Edit] modes first-class on the same surface. No mode is 'primary'." But Edit's only route-level surfaces are gated: src/lib/feature-gates.ts:18-38 sets mashupStudio→starter and vocalSeparation→pro. The mashup page reads tier from session and defaults to free (src/app/[locale]/mashup/page.tsx:24-30; src/lib/auth/session.ts:125,152 both `?? "free"`). The Subscription model defaults `tier @default(free)` (prisma/schema.prisma:747) and there is NO beta bypass (grep for beta/bypass/grant in feature-gates + FeatureGate = 0 hits). In a free closed beta every invitee is on `free`, so the whole Edit mode (Mashup Studio + Vocal Separation) is locked for 100% of the beta circle. This is JOURNEYS finding #2, still open. Edit also has no nav mode — its real capabilities (Extend/Remix/Separate/Stems) live buried inside a per-song SongRemixPanel (src/components/song-detail/SongRemixPanel.tsx), not a first-class surface.

**Proposal:** During the closed beta, either grant all invited accounts a tier that unlocks Edit, or add a `betaAccess` bypass in canUseFeature() so the gates no-op while `free` billing is universal. Longer term, decide the strategy (PRODUCT.md says Edit is free-and-equal; the gates say Edit is paid) and make code and doc agree. If Edit is meant to be a real mode, give it nav prominence and unify Mashup + the per-song SongRemixPanel actions under one Edit surface.

**Impact:** Every beta friend who clicks Mashup or tries Vocal Separation hits an "Upgrade to Starter" wall for a mode the product page advertises as free and co-equal — the single sharpest doc-vs-code contradiction, and it blocks a third of the advertised craft loop.

_Files:_ `src/lib/feature-gates.ts`, `src/app/[locale]/mashup/page.tsx`, `src/lib/auth/session.ts`, `PRODUCT.md`

### [MEDIUM/M] Generate progressive-disclosure / persona-first workflow (the whole point of M002) never shipped — only the internal decomposition did

M002-CONTEXT.md + M001-GENERATE-REDESIGN.md specced a 4-level disclosure (Level 0 Simple: 6 fields; Level 1 Advanced toggle; Level 2 tabs simple/advanced/mashup/compare; persona-pick auto-fills style+lyrics+instrumental). What actually shipped: GenerateForm.tsx has 7 useState (the 30→13 refactor over-delivered internally) and was split into generate-form/*Panel components — but there is ZERO progressive disclosure (grep Advanced|details|Disclosure|expand in GenerateForm.tsx = 0 hits), no persona-first auto-fill, and GenerateTabs.tsx exposes only `create`/`upload`, NOT the planned simple/advanced/mashup/compare tabs. The form still renders every field flat, exactly the mental-model overload the redesign targeted. M002-CONTEXT exit criteria (4 tabs, 301-redirects for /mashup+/compare, generate_v2 flag) are all unmet; STATE.md confirms only M002-S01 done and "M002 stays planned... resumes after M004."

**Proposal:** Ship the user-facing half of M002 that was skipped: a persona/preset pick that auto-fills and pulses the seeded fields (redesign §6.1), and an Advanced disclosure that hides custom-mode + preset/template loaders by default. The sub-panel components already exist (PresetPickerPanel, LyricsGeneratorPanel, etc.), so this is wiring an `<AdvancedDisclosure>` wrapper + persona auto-fill, not a rewrite. Fold /mashup and /compare into the tab strip per D3/D10 while doing it.

**Impact:** Generate is the densest surface and the closest fit to the tool ambition; the promised one-click persona→fields→submit path would genuinely speed the heavy users, and the redesign work is currently stranded at ~50% (maintainability win banked, UX win unbuilt).

_Files:_ `src/components/GenerateForm.tsx`, `src/components/GenerateTabs.tsx`, `.ytstack/M001-GENERATE-REDESIGN.md`, `.ytstack/M002-CONTEXT.md`

### [MEDIUM/L] The planned 17→8 IA consolidation was silently abandoned — analytics-4x, authoring-hub, compare, and route duplication all remain

The M001 follow-up roadmap assigned decisions D3–D14 to milestones M003 (Discover merge, /songs kill, analytics collapse) and M004 (/authoring hub, URL fixes). Per STATE.md those milestone slots were instead spent on the MCP server (M003) and the monorepo+mobile app (M004), so NONE of the IA consolidation ran. Current code still has all the sprawl: AppShell.tsx:60-76 = 17 flat NAV_ITEMS (target 8, grouped by mode); 4 analytics routes (/analytics /stats /insights /dashboard/analytics) all live (D9 undone); 3 authoring routes (/personas /templates /style-templates) with no /authoring hub, and /style-templates has 0 nav references (a live-but-unnavigable route); /songs still duplicates /library (D6 undone); Compare exists only as an SSR /compare route reachable from two deep links (LibraryView.tsx:542, SongVariationTree.tsx:90) rather than the planned /generate?tab=compare (D3). The "three equal modes" IA in PRODUCT.md maps to nothing in the actual navigation.

**Proposal:** Run the deferred M003/M004 as a focused frontend-only wave: collapse /analytics+/stats+/insights+/dashboard/analytics into one /analytics with sub-tabs; build the /authoring hub for personas/templates/style-templates (and either wire or delete the orphaned /style-templates route); merge /songs into a LibraryView view-mode; make Compare a Generate tab; regroup the 17 nav items under the three modes. All with 301-redirects — no schema, low risk.

**Impact:** Operators drive a 17-item flat sidebar with 4 analytics entries and 3 template entries for a tool that claims three modes; duplicate/unnavigable routes are latent confusion and dead surface area that every future UX change has to reason around.

_Files:_ `src/components/AppShell.tsx`, `src/app/[locale]/compare/page.tsx`, `src/app/[locale]/style-templates`, `.ytstack/M001-FOLLOWUP-ROADMAP.md`

### [MEDIUM/M] Discover still ships the exact "Made for you" auto-playlist rails and route duplication PRODUCT.md bans

PRODUCT.md anti-references (line 46) reject "infinite autoplay rails" and "Made for you" streams; principle 1 says Discover must be "a tool the operator opens deliberately, never an algorithmic timeline." Reality unchanged since the June audit (JOURNEYS #6): PlaylistsView.tsx:195-238 renders an "Auto-Generated" section of smart playlists badged "Top Hits" / "New This Week" / "Mood" — literally the recommendation-rail pattern — driven by src/lib/smart-playlists/compute.ts:4 (types top_hits|new_this_week|mood|similar_to). Meanwhile /explore is the SAME component as /discover: src/app/[locale]/explore/page.tsx:3 imports DiscoverView from ../discover/DiscoverView, differing only by `basePath="/explore"`. Plus /feed and /radio round out five discovery routes for a closed circle of a handful of users.

**Proposal:** Pick a side and make code match doc. If Discover-as-tool is the strategy: delete the auto-generated smart-playlist rails (or demote them behind an explicit "suggest" action), collapse /explore into /discover, and thin the 5 discovery routes to what the beta circle actually uses. The smart-playlists engine (sweep/refresh/bootstrap) can stay as opt-in "generate a smart playlist" rather than always-on rails.

**Impact:** The flagship brand promise ("anti-Suno, not a feed") is contradicted on the operator's own Playlists and Discover surfaces; for a ~handful-of-users closed beta, five auto-refreshing discovery routes are pure maintenance surface with near-zero real audience.

_Files:_ `src/components/PlaylistsView.tsx`, `src/lib/smart-playlists/compute.ts`, `src/app/[locale]/explore/page.tsx`, `PRODUCT.md`

### [MEDIUM/L] DESIGN.md — the locked visual spec — applies to zero screens; the whole app is still the old light-violet system

DESIGN.md is the locked brand/visual spec (north star "The Late-Night Studio Console", primary accent Electric Magenta oklch(62% 0.27 350) replacing legacy violet #7c3aed, dark-first). Measured against code: 1726 violet utility classes (bg/text/border/ring/from/to-violet-*) across 177 files, and 0 magenta/OKLCH-token usages in src/. Even GenerateTabs.tsx and the mashup shell hard-code `violet-600`. The default theme resolves to system (ThemeProvider.tsx:49 defaults `"system"`), not the dark-first surface PRODUCT.md mandates. The CHANGELOG [Unreleased] itself admits "No application code changed... components migrate on touch" — i.e. the migration hasn't started.

**Proposal:** Schedule a token swap rather than migrate-on-touch (which leaves a mixed-state app forever): map the violet ramp to the DESIGN.md magenta OKLCH tokens in one pass (tailwind config + a codemod over the 177 files), set the resolved default to dark, and spot-fix the handful of gradient/white-surface violations JOURNEYS flagged. A single large-diff swap is cheaper to reason about than 177 files drifting independently.

**Impact:** The locked brand exists only on paper; users still see the generic light-purple SaaS look the anti-references explicitly forbid, so the strategic bet ("anti-Suno discipline, energy from the work") is invisible in the actual product.

_Files:_ `DESIGN.md`, `tailwind.config.ts`, `src/components/ThemeProvider.tsx`

### [LOW/M] Four names for one concept still fragment the Generate form (Template / Preset / Style Template / Saved Style)

JOURNEYS #4 (and FRICTION audit) named the biggest comprehension cost in Generate: four overlapping terms for "a stored configuration." Unchanged. The form still mounts src/components/generate-form/PresetPickerPanel.tsx AND TemplatePickerPanel.tsx side by side, /templates and /style-templates are separate routes, and StyleTemplateManager.tsx is a third manager — Template vs Preset vs Style Template vs Saved Style with no visible hierarchy. This is a naming/IA gap the M001 plan flagged as a pre-refactor decision (D15 Naming-Drift) that was scoped into M002 and never executed.

**Proposal:** Collapse to at most two clearly-distinct nouns (e.g. a "Preset" = full-form snapshot, a "Style" = style-string only) with one picker and one manager, and align the API vocab (D15). This is largely rename + merge-two-panels, not new capability.

**Impact:** The Generate form is harder to learn than the musical decisions it captures; even returning power users hesitate over which of four "save" affordances to use, adding friction to the most-used craft surface.

_Files:_ `src/components/generate-form/PresetPickerPanel.tsx`, `src/components/generate-form/TemplatePickerPanel.tsx`, `src/components/StyleTemplateManager.tsx`, `src/components/GenerateForm.tsx`


## Lens: DX / CI / Dependencies

CI correctness gates for the web app are solid (lint, tsc, unit, e2e, migration-safety, bundle-size, secrets-scan, gitleaks all gate on PRs to main), but the DX/CI/dependency layer has three real gaps. First, the entire mobile app is ungated — no workflow runs apps/mobile's tsc, lint, or the three existing Maestro flows, right as mobile is the most-churned surface this week. Second, the `pnpm audit` gate is now decorative: it exits 0 while 5 high + 1 critical advisories exist, all six suppressed by an ignore list that SECURITY.md flatly contradicts ("no accepted risks", last audited 2026-03-29). Third, local-dev onboarding is booby-trapped by four divergent DB connection recipes and a `docker compose up --build` path that cannot start the app. Dependencies are drifting (Prisma two majors behind, ESLint EOL). The single highest-leverage move is to add a lightweight mobile CI job (install + tsc + lint against apps/mobile's own lockfile) so the actively-developed iOS app stops merging red type/lint state; the audit-gate honesty fix is the cheapest high-value follow-up.

### [MEDIUM/M] The mobile app is entirely ungated in CI — no tsc, no lint, no Maestro

None of the four workflows in .github/workflows (ci.yml, deploy-production.yml, db-backup.yml, uptime-monitor.yml) reference `apps/mobile`, `expo`, or `mobile` — a grep returns zero hits. Yet apps/mobile/package.json defines `typecheck` (tsc --noEmit) and `lint` (expo lint), and apps/mobile/.maestro/ holds three real E2E flows (smoke.yaml, playlist.yaml, background-audio.yaml). All of it only runs on a developer's machine. This week's CHANGELOG shows heavy mobile churn (tabs navigator rewrite 00418ad6, UX waves 1-4, playback double-skip fixes) — exactly the kind of work where a type error or a broken lint slips in silently because the root `pnpm typecheck`/`vitest` gate only covers src/ + packages/core + mcp, never apps/mobile.

**Proposal:** Add a `mobile` CI job that runs `pnpm install --frozen-lockfile` inside apps/mobile (it has its own lockfile + `packages: []` workspace marker, so it installs independently in ~1 install), then `pnpm typecheck` and `pnpm lint`. Gate it on PRs that touch apps/mobile/** so it does not slow web-only PRs. Maestro-in-CI is a later add; tsc+lint is the cheap 80%.

**Impact:** Mobile developers and the pending iOS beta: today a red typecheck reaches main and is only discovered at the next local `expo run:ios`, after the offending commit is already merged and possibly built on for days.

_Files:_ `.github/workflows/ci.yml`, `apps/mobile/package.json`, `apps/mobile/.maestro/smoke.yaml`

### [MEDIUM/S] The `pnpm audit` gate is decorative — every high/critical is on the ignore list, and SECURITY.md claims the opposite

Measured today (2026-07-18): `pnpm audit --audit-level=high` prints `5 high (5 ignored) | 1 critical (1 ignored)` and exits 0. The JSON metadata confirms `{high:5, critical:1}`. All six are suppressed by `pnpm.auditConfig.ignoreGhsas` in package.json (GHSA-5xrq-8626-4rwp, -96hv-2xvq-fx4p, -hmw2-7cc7-3qxx, -fx2h-pf6j-xcff, -wcpc-wj8m-hjx6, -88fw-hqm2-52qc), so the CI step at ci.yml:58-59 can no longer fail on any advisory that currently exists. Meanwhile SECURITY.md:33 states "No accepted risks at this time. All known high and critical vulnerabilities have been remediated," SECURITY.md:24/49 promise new high/critical "will fail the build," and SECURITY.md:28 stamps "Last audit: 2026-03-29" (~3.5 months stale). The six ignores are exactly undocumented accepted high/critical risks that the policy doc says do not exist. No comment or doc anywhere justifies why each GHSA is safe.

**Proposal:** Identify each of the 6 GHSAs (package + why unreachable), then either remediate via `pnpm.overrides` (as already done for axios/dompurify/protobufjs) or document them in SECURITY.md's Audit Status table with a rationale and expiry date. Re-stamp the audit date. Fix the flat contradiction in SECURITY.md:33.

**Impact:** Operator/security posture: the pipeline advertises a working vulnerability gate and a clean-risk policy while silently carrying an unreviewed critical. A future genuinely-exploitable high could also be masked if it shares one of these IDs.

_Files:_ `package.json`, `SECURITY.md`, `.github/workflows/ci.yml`

### [MEDIUM/S] Four divergent local-dev DB recipes guarantee a failed first-run for new contributors

The database connection string differs across every onboarding surface. `.env.example:8,10` ships `postgres://projects:projects@localhost:5433/sunoflow` (port 5433, user `projects`). `docker-compose.yml:5-11` creates the db with user `sunoflow`/`sunoflow` published on port 5432. README.md:65 documents `postgres://user:password@localhost:5432/sunoflow`. CI (ci.yml:18-31) uses `projects:projects@localhost:5432`. So a new dev who does the obvious thing — copy `.env.example`, then `docker compose up db -d` (README.md:77) — points Prisma at port 5433 with user `projects` while the container listens on 5432 as user `sunoflow`. `pnpm exec prisma migrate deploy` (README.md:81) fails with connection-refused/auth-failed on the very first step.

**Proposal:** Pick one canonical local pair and make `.env.example`, docker-compose.yml, and the README block agree (compose is the source of truth: user `sunoflow`, port 5432). Either change the compose POSTGRES_USER/port to match `.env.example`, or fix `.env.example` to `sunoflow:sunoflow@localhost:5432`. One-line changes in three files.

**Impact:** Every new contributor and every self-hoster (the "handful of users" running their own instance) hits a dead first-run and has to reverse-engineer three files to reconcile port + credentials.

_Files:_ `.env.example`, `docker-compose.yml`, `README.md`

### [MEDIUM/S] `docker compose up --build` — the README's "recommended" local path — cannot start the app

README.md:322-334 presents `docker compose up --build` as the recommended local/staging way to run the app. But the compose `app` service (docker-compose.yml:18-42) bind-mounts `.:/app` over a production standalone image and forces NODE_ENV=development, with no `command:` override — so it runs the image CMD, whose entrypoint (docker-entrypoint.sh:96) ends with `exec ... node server.js`. The standalone `server.js` exists only inside the image at `/app/server.js` (Dockerfile:62 copies `.next/standalone` to `./`); the `.:/app` bind mount replaces `/app` with the host cwd, which has no `server.js`. Result: `Cannot find module '/app/server.js'` and a crash loop. Even if it started, it is a production build tagged development — no Turbopack, no hot reload — not a dev environment.

**Proposal:** Either give the compose `app` service a real dev command (`command: sh -c "pnpm install && pnpm dev"` with the source mount and NODE_ENV=development, dropping the production Dockerfile build for local use), or delete the `app` service and document compose as DB-only (which is what README.md:77 already does for `docker compose up db -d`). Update the README to match whichever path actually works.

**Impact:** Anyone following the README Deployment/local guide gets a crash-looping container and no obvious cause; the documented happy path is broken.

_Files:_ `docker-compose.yml`, `docker-entrypoint.sh`, `README.md`

### [MEDIUM/M] Prisma is two majors behind (5→7) and ESLint is EOL (8→10)

`pnpm outdated` shows two dependencies that are stale enough to matter beyond cosmetics. `@prisma/client` and `prisma` are pinned at 5.22.0 while latest is 7.8.0 — two major versions behind, so the app is off Prisma's support line and missing two years of query-engine perf and bug fixes. `eslint` is 8.57.1 vs 10.7.0; ESLint 8 reached end-of-life on 2024-10-05, meaning the linter itself receives no security or bug fixes, and `eslint-config-next` is 15.5.18 vs 16. Beyond these, a long tail is drifting: @sentry/nextjs 10.45→10.66, openai 6.32→6.48, posthog-js 1.363→1.404 (~40 minors), next-intl 4.11→4.13, next 15.5.18 vs 16. (React web at ^18 vs mobile at 19.2.3 is expected — separate dependency trees.)

**Proposal:** Sequence two focused upgrades: (1) ESLint 8→9 flat-config with eslint-config-next 15→16 (the config-migration is the real work); (2) Prisma 5→6→7 following the two migration guides, gated by the existing CI unit + e2e suite. Sweep the minor tail (Sentry/openai/posthog/next-intl) in a single low-risk PR. Keep @types/node on 20 to match the Node 20 runtime.

**Impact:** Security patch cadence and maintainability: an EOL linter and an out-of-support ORM both accumulate unpatched issues, and every month of drift makes the eventual jump larger.

_Files:_ `package.json`

### [LOW/M] CI does two cold `next build`s + two installs per push, with no turbo/remote cache

The `qa` job runs a full `pnpm build` (ci.yml:79-80, non-standalone via PLAYWRIGHT_TEST=true), then the `lighthouse` job — which `needs: [qa]` and is `continue-on-error` (i.e. purely informational, ci.yml:134-140) — re-installs deps, re-runs prisma generate + migrate, and does a SECOND full `pnpm build` (ci.yml:193-194) just to produce a standalone server to score Lighthouse. So every push to main pays for two cold Next.js builds, two `pnpm install`s, and a Playwright browser download, largely serially. There is no turbo.json / no build orchestration cache (the repo is a monorepo without turbo), only the `.next/cache` actions/cache. Lighthouse is explicitly non-gating yet costs a whole extra build every run.

**Proposal:** Move the Lighthouse job to a nightly schedule or a manual/`workflow_dispatch` trigger instead of every push/PR, or have `qa` produce the standalone build once as an artifact that the lighthouse job downloads rather than rebuilding. Either roughly halves the per-push CI wall-clock.

**Impact:** CI latency and Actions-minutes for a small team: informational Lighthouse scoring doubles the most expensive step (a cold Next build) on every commit to main.

_Files:_ `.github/workflows/ci.yml`

### [LOW/S] `.dockerignore` omits `apps/`, streaming the whole mobile tree into the web build context

.dockerignore lists node_modules, .next, e2e, scripts, etc. but not `apps/`. The build stage does `COPY . .` (Dockerfile:34), so a local `docker build` / `docker compose build` sends the entire apps/mobile tree into the build context and bakes it into the build layer — including up to ~600 MB of `apps/mobile/ios/Pods` when the native project has been prebuilt locally (measured 612 MB today). The web image never imports anything from apps/mobile (pnpm-workspace only includes packages/*), so this is pure waste. CI/Railway are spared because apps/mobile/ios is gitignored, but local docker builds are not. This file already caused a real incident once (mcp wrongly excluded, CHANGELOG.md:101, fixed in d34a43d), so it is worth a deliberate line.

**Proposal:** Add `apps` to .dockerignore. The web Dockerfile only needs package.json/lockfile/packages/prisma/src/public/etc., never the Expo app. One line.

**Impact:** Local docker build speed and disk: developers building the image locally pay a multi-hundred-MB context copy for files the web image discards.

_Files:_ `.dockerignore`, `Dockerfile`


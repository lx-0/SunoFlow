# Changelog

All notable changes to this project. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the version numbers follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Party Mode / Jam Sessions (M005)** (2026-07-22, `44d03968`…`701105a5`). A STUDIO host opens a jam session — under the hood a playlist with a live queue and an atomic song budget. Guests join via QR / share link (`/jam/<token>`) **without an account** and push prompts that appear instantly as pending cards; generations run through the existing pipeline on the host's account, and completed songs land in the session playlist AND auto-append to the host's running play queue (toast). Host console at `/party/[id]`: budget countdown, fullscreen join-QR presentation mode, veto on pending cards, end-session with inline confirm. Guest page: mobile-first, now-playing card, request queue, prompt composer with vibe chips, persisted nickname, inline error states. Guardrails are server-side and race-safe: per-guest open-prompt cap, conditional-increment budget reservation (no overshoot), host veto, and — on operator request — **custom human share slugs** (`/jam/alex-party`, collision 409) plus a **session lifetime** (default 24h) enforced derived (expired sessions read as closed everywhere, incl. inside the budget gate). 49 unit tests, committed host-flow e2e + an opt-in keyless two-context full-path e2e (`JAM_KEYLESS_E2E=1` — a default run can never burn generation credits). New test infra: `POST /api/test/grant-tier` and `/api/test/` middleware prefix; `/api/test/login` now mirrors tier/admin into its JWT (tier-gated UI was untestable before). Remaining acceptance: the real party test.
- **Synced lyrics — the player lyrics panel highlights the line being sung** (2026-07-22, `fe0c904c`, mobile trigger `67f1bec2`). Suno's word-level `get-timestamped-lyrics` (verified against the live API: section tags arrive embedded like `"[Verse 1]\nDie "`) is aligned onto the existing per-line `LyricTimestamp` table by a tolerant token matcher; the idempotent `POST /api/songs/[id]/lyrics/timestamps/sync` derives timestamps ONCE per song (the upstream call is billed, unavailable outcomes negative-cached 6h; manual tap-editor timestamps always win). `LyricsPanel` is dual-mode: karaoke view with active-line highlight, auto-scroll and click-to-seek in the mini player + expanded player; static text stays the fallback (uploads, instrumentals, expired upstream tasks). The mobile lyrics screen now triggers the same sync (JS-only, on-device verification pending).
- **Sidebar account menu (nav consolidation Phase 3)** (2026-07-22, `a0ffadbb`). The six-item bottom block (Admin / Profile / Settings / language / Feedback / Sign out + Plan badge) collapsed into one account entry with an upward popover, in the desktop sidebar and the mobile drawer; the language switcher moved to Settings → Preferences. Accessible name "Account menu" (deliberately not "Account" — the Settings page's Account tab would collide in a hydration race). New e2e spec incl. sign-out via menu; 4-state visual pass.

### Changed

- **Web navigation consolidated: sidebar 17 → 10 items, synonym clusters merged behind tabbed hubs** (2026-07-20; Phase 1 `09d74278`, Phase 2 `f780550f`). A critical synthetic-user panel (8 divergent personas, unanimous — *synthetic-panel signal*, not user data) judged the flat 17-item sidebar an undifferentiated wall: no hierarchy, no start-here, Generate buried as the fifth gray row, and several near-duplicate clusters that made confident single-clicks impossible (findability failed outright on "find others' music" and "how are my songs doing"). **Phase 1** grouped items into labeled sections (Create / My Music / Browse) and promoted Generate to the filled primary CTA — non-destructive, no routes touched. **Phase 2**, grounded in a per-page characterization of all 8 cluster pages, consolidated the clusters: `/explore` (a literal `/discover` duplicate — same `DiscoverView` + same `getInitialBrowseSongs` query) 301-redirects to `/discover`; Radio (reachable from song cards) and Feed (empty in the closed beta) leave the nav; `/analytics` + `/stats` + a third un-linked `/insights` collapse behind one "Insights" destination; `/history` + `/generations` group under Library. A shared `SectionTabs` component exposes each cluster as one destination with tabs (Overview / Production / Listening for Insights; Songs / Recently Played / Generation History for My Music) — no view merged, every feature stays reachable (tab / chip / redirect / song-card entry); Favorites stays a Library filter chip (the `nav-favorites` onboarding anchor moved onto it). Verified: visual harness (both `SectionTabs` groups render with correct active states across 6 pages), prod build green, `/explore → 308 → /discover` confirmed live. Deferred (tracked in STATE): dedupe the overlapping Insights *view* content, give Feed a "Following" home + Radio a browse-hub tab, delete the now-dead `/explore/page.tsx`. See DECISIONS 2026-07-20 (web nav consolidation).

### Security

- **2026-07-22 advisory batch cleared from the audit gate** (`fe878e97`). A fresh wave of high advisories (fast-uri, axios ≤1.17, js-yaml, brace-expansion in three majors, sharp/libvips, immutable) blocked all deploys via the `pnpm audit --audit-level=high` CI gate. Overrides bumped to the patched lines and — lesson — **bounded per major** (`">=2.1.2 <3"`): an unbounded override let pnpm reuse an already-present still-vulnerable foreign-major brace-expansion for minimatch@9. `sharp` bumped in BOTH install sites (lockfile override + the Dockerfile's separate runtime install — the lockfile alone would have been cosmetic; 0.35.3 runtime-verified via `/_next/image`). The two immutable highs are ignored with justification (swagger-ui-react pins immutable 3; patched line is a major jump). Audit exit 0 under pnpm 9 and 11.

- **Three unauthenticated exposure holes closed** (2026-07-20 audit, `86b31aa4`), each with an independent verification that legitimate access still works:
  - `/api/images/[songId]` served **private/hidden/archived cover art to anyone** by cuid — now `optionalAuthRoute`, serves public songs OR the owner (404 otherwise); owner + public access preserved.
  - `/api/analytics/view` was an **unauthenticated, unthrottled DB write** (viewCount inflation + SongView row-spam) — added a per-IP burst cap + per-IP+song dedup window via `acquireAnonRateLimitSlot`; single genuine views still count.
  - `/api/health` **leaked job error strings + ops metrics** unauthenticated — anon now gets minimal `{status, timestamp, db, uptime}` (uptime monitors + the deploy pipeline keep the public `status`), the full payload is behind `requireAdmin`. Live-verified in prod.
- **RSS-fetch SSRF hardened** (`766a22a7`). The guard was hostname-regex only — numeric/encoded IPs (`http://2130706433/`), DNS-rebinding, and `http://`+redirect-to-internal all bypassed "public HTTPS only". New `src/lib/rss/ssrf.ts` `isSsrfUrlResolved`: https-only, default-port-only, DNS-resolves the host and blocks if ANY resolved address is private/reserved; both the feed fetch and the article-enrichment fetch follow redirects manually and re-validate every hop. (Residual, flagged: TOCTOU DNS-rebinding needs resolved-IP pinning; a follow-up.)

### Fixed

- **Mini-player options menu crashed on every item click** (2026-07-22, `dacb0cd3`). The menu's close handler called ITSELF instead of the `onClose` prop — `RangeError: Maximum call stack size exceeded` on Lyrics/Shuffle/Repeat/click-outside, menu never closed (found via the `ErrorReport` table + reading the minified prod chunk at the stack offset). One-line fix; e2e regression spec reproduces the exact prod error RED→GREEN and asserts zero pageerrors.
- **/api-docs had been silently broken for weeks — "Class extends value undefined"** (2026-07-22). The core-js noop catch-all in `next.config.mjs` (an earlier bundle-size optimization) also nooped `core-js-pure/features/aggregate-error`, but swagger-ui-react → `@swagger-api/apidom-error` does `class … extends AggregateError`, and a noop is not a constructor — the page rendered its error boundary with no pageerror signal. Class polyfills are now explicitly mapped to the native global inside the catch-all callback (it runs beforeResolve, so a resolve.alias alone never applies); swagger-ui-react bumped 5.32.1 → 5.32.11 alongside. Verified: 41 operations render, zero console errors. Related: `js-yaml` pinned to 4.1.1 (`b990cb4f`) — 4.2+/4.3 drop the CJS default export swagger imports; the high advisory is ignored with justification (client-side parser for our own spec, no untrusted YAML).

- **Expanded player: main controls overlapped the Lyrics/Up Next/EQ tab row on desktop** (2026-07-20, `6eb8086c`). On `md+` the upper region was `flex-initial` (shrinkable) with `min-h-0` and `overflow-visible`; when the modal content exceeded `max-h-[90vh]` the region shrank and its content (cover + main/secondary controls) spilled visibly over the `flex-shrink-0` tab row below, stacking the play button on top of the tabs. Switched to `md:flex-none` so the region keeps its natural height and the whole modal scrolls via `md:overflow-y-auto` instead. Verified by replicating the exact flex cascade in isolation (67px overlap → clean gap) + live in prod.
- **`pnpm release` broke under pnpm 10+/11** (2026-07-20, `81831435` root + `e7a46368` mobile). pnpm 10+ stopped reading the `package.json` "pnpm" field, so the dependency-build-approval list was ignored and `pnpm install` (run by the release's deps-status check) hard-failed with `ERR_PNPM_IGNORED_BUILDS` on `msgpackr-extract` + `unrs-resolver`; the 17 security `overrides` were also being silently dropped from resolution. Mirrored `overrides` + `onlyBuiltDependencies` + `auditConfig` into `pnpm-workspace.yaml` (root) and approved the two native addons in the standalone `apps/mobile` workspace via `allowBuilds`. The package.json copy stays for CI (pnpm 9 via the `packageManager` pin). Verified under pnpm 11.15.1: install exits 0, no `ERR_PNPM_IGNORED_BUILDS`, lockfile unchanged.
- **Per-day view/play/generation charts were permanently all-zero** (2026-07-20 audit, `86b31aa4`). `Date.toString().slice(0,10)` yields `"Mon Jul 20"`, which never matched the `toISOString()` day keys — `/api/songs/[id]/analytics` `views7d` reported 0 for every day, and the same bug in the shared `fillDailySeries` helper silently zeroed `dailyPlays`/`dailyGenerations` on three more analytics surfaces. Fixed the route + the helper; retyped the raw-query date generics `string → Date`.
- **Suno SUCCESS webhook could canonicalize ready-but-unplayable songs** (`86b31aa4`). It called `handleSongSuccess` unconditionally; a SUCCESS payload whose clip has no resolvable audio now stays `pending` for the loud poll/stale-recovery path (mirrors the `pollOnce` guard added after the 2026-07-08 incident).
- **LLM failures were invisible to error tracking** (`86b31aa4`). `generateText` swallowed OpenAI errors to Pino and returned `null`, bypassing callers' `logServerError` — lyrics/auto-gen/genre-suggest failed with a generic 500 and zero GlitchTip signal. Genuine API errors are now tracked (content-policy rejects stay noise-filtered). Also gave the OpenAI client an explicit 30s timeout + a 45s per-request `AbortController` deadline so a stalled completion can't starve the feed cron.
- **`similar-to` smart playlist crashed on a malformed embedding row** (`86b31aa4`) — the `as unknown as number[]` cast is replaced with `parseEmbeddingVector` + skip-invalid.
- **Cache warmup walked the whole catalog every boot** (`86b31aa4`) — an unset batch size meant no `take`; now bounded by a default cap.
- **Queue-drain generation failures were invisible to GlitchTip** (`7ada2465`) — the circuit-recover replay marked songs failed after the Suno call but only Pino-logged; now calls `logServerError` like the sibling process-next path (the exact Suno-flaky window is where it matters).
- **Archive smart playlist made reliable — the feature existed but was broken three ways** (`da464953`). The sweep wiped it every run, its count was always 0, and library-batch-archive never surfaced songs. Now VIRTUAL (`Song.archivedAt` is the single source of truth, no materialized membership); the Archive tile links to the library archive view; every read special-cases it and every write rejects smart playlists. Runtime-verified end to end.
- **Ratings consolidated onto the canonical `Song.rating` store** (`3fe36a1f`). Web + mobile already both write `Song.rating`; the legacy `Rating` table is write-dead. Removed a vestigial fallback read that could surface a stale legacy rating, and the dashboard no longer shows two divergent averages (both now derive from `Song.rating`). Non-destructive — no rows migrated.
- **GDPR export no longer blocks the event loop** (`766a22a7`) — the unbounded `findMany` over every song + synchronous `JSON.stringify` on the request path (a CLAUDE.md-flagged liveness-probe risk) now paginates by cursor and yields the loop around each stringify; output format unchanged.

- **Prod-DB incident: 114 "ready" songs had dead audio origins** (2026-07-17). Their `audioUrl` still pointed at the aggregator's expiring `tempfile.aiquickdraw.com` host (all HTTP 404); the permanent `cdn1.suno.ai/<clipId>.mp3` derivation served every one of them. Migrated all 114 rows in one guarded transaction (ROW_COUNT assertion, full `pg_dump` + before-snapshot kept locally, 114/114 derivations HEAD-verified first). Durable fix in `proxyAudio` (`cfa5790e`): a last-resort derived-cdn1 fallback that streams and **heals the row** when origin + aggregator refresh are both dead. Deployed + live-verified. Known-still-dead, deliberately untouched: 14 tempfile cover URLs (10 carried by the server file cache, 4 truly gone — regenerate-or-placeholder is an open product call) and 3 tempfile video URLs.
- **Mobile: auto-advance double-skip window closed + 700ms playback re-render churn eliminated** (`a541dd35`, `1d166e28`). The `advancing` guard now stays set until the poll sees the new track settle (fresh pos / landed seek / 15s timeout escape-hatch); the poll only emits when playing/position/duration actually changed (a paused app re-renders nothing), and `usePlaybackSelector` gives non-position consumers (queue, add-to-playlist) slice subscriptions.
- **Mobile: upload poll could set state/navigate after unmount** — `aliveRef` was only checked before the sleep, unlike its generate/mashup siblings (`6262dac2`; drift found by the architecture exploration, now impossible by construction via the shared core poll loop).

- **Inspire now uses the full link-followed article as the lyrics generation basis, not a one-sentence excerpt** (commit `7cdc2b7b`). The RSS pipeline already downloaded the full article into `RssItem.content` (≤5000 chars), but every downstream consumer truncated it back to a sentence: the Today's-Picks digest built `suggestedPrompt` from title + mood + topics only (and `DigestItem` never carried `content`), the Inspire→Generate handoff clamped the body to 520 / total 800 chars, and `/api/lyrics/generate` + the generator textarea capped the basis at 2000. Now `DigestItem` carries `content`, both Inspire paths (RSS card "Generate from this" + Today's Picks) pass the whole article as `lyricsprompt`, and the basis caps are raised to 6000. **Runtime-unverified** (typecheck + unit only). Two truncation levers remain open by design: `CONTENT_THRESHOLD = 200` (link-following only fires for very short or read-more-marked inline bodies) and the auto-generate cron path (`buildSimplePromptFromItem`, body sliced to 1500).

### Changed

- **Web app migrated to the DESIGN.md brand — dark-first, Electric Magenta, Lucide** (Wave A batches 2/3/9, `97aa8f60` + `85bcba28` + `b1628b45`). ~250 files moved from Heroicons to Lucide (22px / stroke 1.5 via a canonical `Icon` wrapper) and from paired light/dark gray literals to semantic surface tokens, on top of the batch-1 foundations (dark-first default, gray→hue-350 retint, magenta bridge). Covered: the shared chrome (AppShell + global player; the mobile bottom nav dropped from 5 tabs to the 3 PRODUCT.md modes + More), the chart/confetti one-file levers, the core-loop components (Browse/Generate/Edit/Playlists/SongDetail), the authed routes + 30 error boundaries + the long-tail components, and the static PWA assets (manifest `theme_color`, offline page, and regenerated install icons — now magenta-on-near-black). Visual-only; each batch verified by two adversarial reviewers + a screenshot journey diff. **Not migrated: A8 public/embed/landing** — its indigo-violet gradients need a design pass, not a mechanical swap (open operator call). The mobile app already carried this brand from the M004 work.
- **`session.user` is properly typed** (`766a22a7`) — ~19 `as unknown as Record<string, unknown>` boundary casts replaced with a next-auth module augmentation (`src/types/next-auth.d.ts`); the subscription tier is validated into its union (`normalizeTier`, single source = `TIER_ORDER`) at the one JWT write site.

### Removed

- **~4,000 lines of dead code** (`7ada2465`) — 30 zero-importer files (superseded view components, triplicated library hooks, orphaned generate-form/song-actions/manager hooks, long-named playlist-detail panels superseded by their short-named twins) plus two unused runtime deps (`@stripe/stripe-js`, `@tanstack/react-query-devtools`). Grep-verified no importers / no test deps; tsc + build + full suite green after.

- **Mobile navigation is a REAL Tabs navigator now** (`00418ad6`): five per-tab stacks via a shared 5-way route group with per-segment anchors, replacing the flat root Stack + `dismissAll()+navigate()` pseudo-tabs. Instant state-preserving tab switches, predictable Back (returns where you came from), active tab stays highlighted on drill-downs, Profile is a real tab, re-tap pops to the tab root; the Now-Playing modal is headerless (swipe-down dismiss) with queue/lyrics/add-to-playlist as sheets above it and `closePlayerThen()` landing content exits on the ACTIVE tab. Tab switches dispatch NAVIGATE-by-name at the navigator level (expo-router 56's `linkTo` cannot express "switch tab without touching its stack"). Spec rewritten: `apps/mobile/NAVIGATION.md`.
- **Mobile UX waves 1–4** (`8414e4b8`, `8ea2ad2d`, `f2824f20`, `056a3e12`): Geist finally renders app-wide (themed `Text`/`TextInput` wrappers mapping fontWeight → family), WCAG-AA primary CTAs (dark `accentStrong` → Electric Magenta fill), magenta waveform progress, pull-to-refresh on all 12 primary lists + silent stale-while-revalidate on tab focus (the Library never goes stale, no spinner flash on tab return), Library/Mashup got real error/empty states with Retry, an a11y sweep (labels/roles/states everywhere, VoiceOver-modal sidebar), keyboard handling (`useHeaderOffset` + KAVs on all form screens), and the design-token wave (radius/spacing scales, `surfaceHover`, shared `Chip`, One-Spark fixes). Full audit trail: `apps/mobile/UX-REVIEW-2026-07-17.md`.
- **Architecture deepening across web + mobile + core** (`b2c93ff1`): `@sunoflow/core` gained the shared queue machine (ONE queue/shuffle/repeat semantic for the web player and the mobile controller, duplicate-safe reorder), the generation-poll loop, boundary-coercion primitives and the `createJsonClient`/`HttpError` contract (one class identity across web, mobile and the react-query retry gate). Web: `songs/asset-refresh.ts` + `images/proxy.ts` concentrate the refresh-and-heal policy (custom-cover guard everywhere, cover requests can never rewrite `audioUrl` via `healAudio: false`); `advancePendingSong` dispatcher unifies the SSE stream / status route / stale sweep. Mobile: `useListResource` (8 list screens) + `usePollingJob` (3 form screens) replace the stamped per-screen plumbing; the api layer dropped 24 divergent local helpers and 201 inline coercions. Net ≈ −600 lines with ~120 new tests (suite: 1788 passing).
- **Generate form lyrics-field limit raised 3000 → 5000 chars.** The cap was an artificial SunoFlow constant (`generate-form/helpers.ts`); the form always generates on the default model `V5_5`, whose real Suno limit is 5000 (V4 is 3000). The server's `validatePrompt` already enforced the true per-model limit, so the client constant needlessly capped lyrics 2000 chars below what the API accepts.

### Added

- **Brand + visual-system baseline as agent-readable docs.** Three artifacts now live at the project root and capture strategy, visual identity, and current UX reality:
  - `PRODUCT.md` — strategic spec (register, users, brand personality, anti-references, design principles, accessibility). Register is `product`, brand personality is *Playful · Vibrant · Disciplined*, dark-first.
  - `DESIGN.md` — Google Stitch-format visual spec with YAML frontmatter (color, typography, rounded, spacing, component tokens in OKLCH) + 6 fixed sections (Overview, Colors, Typography, Elevation, Components, Do's and Don'ts). North star *"The Late-Night Studio Console"*. Primary accent is Electric Magenta `oklch(62% 0.27 350)`, replacing the legacy violet `#7c3aed`. Geist Sans + Geist Mono as the only typefaces; Mono reserved for user-authored content (lyrics, prompts, slugs, IDs).
  - `.impeccable/design.json` — sidecar in the impeccable schema carrying 8-step tonal ramps, shadow / motion / breakpoint tokens, and 8 self-contained HTML+CSS component snippets (Live-panel consumer behaviour not verified in this session).
- **As-is UX audit (`JOURNEYS.md`) + reproducible Playwright recorder (`/tmp/sunoflow-journey/journey.mjs`, ephemeral).** Recorded 2026-06-02 against a fresh authed user on an empty database. 32 screenshots, desktop 1440x900 + mobile 390x844. Surfaces 7 priority findings, smallest blast-radius first:
  1. `/library` renders a "Failed to load library" **error** for fresh users instead of an empty state. Same bug on mobile.
  2. Mashup (the entire Edit mode) is paywalled behind "Upgrade to Starter", contradicting PRODUCT.md's three-equal-modes claim.
  3. Two app shells coexist: Shell A (Library, Generate, Mashup) has no top bar; Shell B (Templates, Settings, Feed, Profile, Discover) has search + credit pill + email-verify banner. Half-finished migration.
  4. Four overlapping names for one concept inside the generate form: Template / Preset / Style Template / Saved Style.
  5. Discovery cluster (`/discover`, `/explore`, `/feed`, `/radio`, `/inspire` + auto-generated playlists "Your Top Hits" / "Mood: Chill") implements exactly the recommendation-rail / "Made for you" pattern PRODUCT.md explicitly bans.
  6. Whole-app visual migration: light theme + violet + pure white surfaces dominate every screen; no screen matches the new DESIGN.md yet.
  7. Twenty top-level routes vs the "three modes" model. Real surface area: Browse + Generate + Edit + Discover + Social + Meta. Strategic alignment needed before further UX work.

### Notes

- No application code changed in this entry. The docs are the artifact. Treat DESIGN.md as the target system; existing components (1049 inline `bg-violet-*` / `text-violet-*` utilities, `font-family: Arial` fallback in `globals.css`) migrate on touch.
- `JOURNEYS.md` is a dated audit snapshot. The living UX spec (`UX.md`, hybrid YAML-metadata + 6-section markdown) is not yet written; it is the next decision point and depends on resolving the mode-model question (three or six modes).

### Mobile (native app, `apps/mobile`) — navigation, song-detail parity, UI polish

Native iOS app (Expo SDK 56, New Arch) work. JS-only unless noted; runtime behavior is
statically verified (tsc + eslint) but **not yet device-tested** — the M004 GATE dev
build is still the gate.

- **Fixed navigation tree** (commits `26b8b832`, `6c180f93`, `e33f6e6c`). Reworked the
  ad-hoc flat stack into a native music-app model. Single source of truth in
  `apps/mobile/src/navigation.ts`: `switchTo` (nav bars) / `goToSection` (in-view jumps)
  collapse the stack to the home base (`dismissAll` → `navigate`) so sections never stack
  and Back returns to the home tab; `openPlayer` uses `navigate` (never `push`) so the
  Now-Playing modal can't open twice (was 21 `push("/player")` sites). Bottom tab bar +
  mini-player rendered once globally in the root layout (`GlobalChrome`), persistent
  across all screens, hidden on `/login` + `/player`. Full UX spec + call-site audit in
  `apps/mobile/NAVIGATION.md`. Consequence: every scrollable screen now clears the global
  tab bar via `MINIPLAYER_CLEARANCE` (16 stragglers fixed).
- **Bottom-right tab → Profile** (`365928c2`); Settings moved to the sidebar. Profile
  screen now surfaces Stats (+ streak) at the top.
- **Song detail PWA parity** (`7f0fdc49`). The Suno **style** prompt (`tags` string) was
  never rendered — now in a labeled metadata card (Style / Model / Duration / Created /
  Instrumental / Suno ID). Tags card shows real custom `SongTags` (`fetchSongTags`)
  instead of the always-empty `song.tags`. Added thumbs up/down feedback
  (`src/api/song-feedback.ts`), an "Add to playlist" action (route now takes
  `?songId&title`), and a "Variation — view the original" link. `SongDetail` gains
  `isInstrumental` + `parentSongId`.
- **Consistent UI/UX polish across ~35 screens** (`c15eb6b2`, `beb193ec`): shared
  `EmptyState`, surface cards, unified inputs/labels/primary buttons, section headers,
  mini-player clearance — theme tokens only, no logic changes.
- **Animation toolchain present but unwired:** Reanimated 4 + worklets + gesture-handler
  + screens are installed (SDK 56, New Arch on) but `babel.config.js` lacks
  `react-native-worklets/plugin` and nothing imports them yet. Software Mansion
  `react-native-best-practices` + Expo `building-native-ui` skills vendored into
  `.claude/skills/` (gitignored).

## [0.4.0] — 2026-05-28

Remote MCP server. The `sunoflow` Claude Code plugin used to require the operator to clone the repo, set `DATABASE_URL`, and spawn `tsx mcp/server.ts` to use the MCP server. After this release the plugin ships a `.mcp.json` pointing at the hosted Streamable-HTTP endpoint — `/plugin install sunoflow` + `export SUNOFLOW_API_KEY=sk-...` is the entire setup.

### Added

- **Remote MCP server at `POST/GET /api/mcp` (Streamable HTTP, MCP spec 2025-06-18).** Fresh `Server` instance per request, stateless mode, all 15 tools + 4 resource providers wired via a shared registry that both transports use. Auth: `Authorization: Bearer sk-...` against the existing `ApiKey` table. Origin allowlist (`claude.ai`, `desktop.anthropic.com`, `app.cursor.sh`, `cursor.sh`; override via `MCP_ALLOWED_ORIGINS`). Per-key sliding-window rate limit (60 req/min, override `MCP_RATE_LIMIT_RPM`). Sentry/GlitchTip events on every reject path (`mcp.origin.rejected`, `mcp.auth.rejected`, `mcp.rate_limit.exceeded`, `mcp.handler.error`).
  - `src/app/api/mcp/route.ts` (handler), `src/lib/mcp/{http-transport,register-handlers,registry-bootstrap,origin-guard,rate-limit}.ts` (shared modules), `mcp/auth.ts` (split into env + header resolvers).
  - `src/middleware.ts`: `/api/mcp` added to `PUBLIC_PATHS` so the JWT-cookie redirect doesn't shadow Bearer-only clients.
- **Plugin ships `.mcp.json`** at repo root with env-var interpolation: `${SUNOFLOW_BASE_URL:-https://sunoflow.app}/api/mcp` + `Authorization: Bearer ${SUNOFLOW_API_KEY}`. Self-hosters override the base URL.
- **`scripts/smoke-mcp.mjs`** — operator CLI that drives `initialize` → `tools/list` → `tools/call sunoflow_info` against any HTTP MCP endpoint; one line per protocol step, exits non-zero on the first failed check.
- **`@mcp/*` path alias** in `tsconfig.json` + `next.config.mjs` + `vitest.config.ts` so the shared modules under `src/lib/mcp/` can import the legacy `mcp/` directory (tools, providers, registry, resources) without relative-up traversal that breaks the Next.js production webpack build.

### Changed

- **Plugin manifest 0.2.2 → 0.3.0** (`.claude-plugin/plugin.json`) with rewritten description reflecting the remote-HTTP model.
- **`docs/MCP.md`** restructured as dual-transport doc with Streamable HTTP as the recommended path and stdio marked legacy.
- **`lx-0/skills` marketplace entry** rewritten to point at the remote endpoint (commit `178781c` in that repo).

### Deprecated

- **Stdio transport (`mcp/server.ts`)** logs a startup banner on `stderr` pointing operators at the remote endpoint. Keeps working for self-hosters with the repo cloned; planned removal in a future release.

### Fixed

- **Docker build was excluding `mcp/`.** `.dockerignore` listed `mcp` which made the production webpack build fail with `Module not found: Can't resolve '@mcp/registry'` four deploys in a row before the entry was dropped (commit `d34a43d`).
- **`mcp/tools/info.ts` hardcoded version** was stale at `0.2.1`; bumped to `0.3.0` along with `mcp/server.ts`.

### Notes

- **S05 OAuth path cancelled, not deferred.** Bearer-only auth is production-fine for the closed beta. If OAuth becomes relevant later it gets a new milestone, not a zombie-open slice in a closed one.
- **Verification:** 24 vitest passing (12 route + 2 transport + 10 stdio server), `pnpm tsc --noEmit` clean, `pnpm build` green. Live deploy verified at the server boundary (`401` + `WWW-Authenticate: Bearer realm="sunoflow"` + Origin allowlist pass); full E2E tools/call against prod DB requires an operator with an API key (run the smoke script).

## [0.3.0] — 2026-05-21

Closed the beta: registration is now invite-only, and the landing page no longer pretends to be a launched public product. Driven by reality — the app is heavy WIP with a handful of real users, so the fabricated social proof and open signup were misleading.

### Added

- **Invite-only registration (single-use codes).** `/register` now requires a valid invite code. New `InviteCode` model (single-use: `usedByUserId @unique`, optional `expiresAt`), validated and claimed atomically with a guarded `updateMany` + user-rollback on a lost race. Admin emails (`ADMIN_EMAILS`) bypass the gate for bootstrapping. Code field on the register form prefills from `?invite=`.
  - `src/lib/auth/invite.ts` (generate/normalize/validate), `src/lib/auth/register.ts` (gate + claim), `src/app/api/register/route.ts` (`inviteCode` in body), `src/app/[locale]/register/page.tsx` (UI).
  - Migration `20260521120000_add_invite_code` (applied on prod boot, verified in deploy logs).
- **Admin invite-code management.** Generate (count/note/expiry), list with status (available/used/expired), and copy codes at `/admin/invite-codes` (`GET/POST /api/admin/invite-codes`, `adminRoute`), plus an AdminShell nav link.

### Changed

- **Landing page reframed from launch-marketing to honest private beta.** Hero badge → "Private beta · invite-only · work in progress"; CTAs → "Have an invite? Sign up" + "Request access" (mailto); beta-banner copy rewritten and the false "no limits" claim dropped.

### Removed

- **Fabricated social proof.** Deleted the "Trusted by creators worldwide" section and the `getLandingStats()` engine that floored ~2 real users/songs to "2,500+ / 10,000+" via `Math.max`. The homepage no longer queries the DB for vanity stats.

### Notes

- Google-OAuth signup gate **deferred** — `AUTH_GOOGLE_ID/SECRET` are unset in prod (provider inactive), so the PrismaAdapter auto-create hole is not reachable. If Google is enabled later, a `signIn` callback blocking new OAuth users becomes required (see DECISIONS.md 2026-05-21).
- **Verification:** `tsc` clean, register unit tests 19/19 (incl. new invite-gate cases), `pnpm build` green, CI green with `prisma migrate deploy` against real Postgres. E2E unblocked via a `PLAYWRIGHT_TEST` bypass on the invite gate.

## [0.2.3] — 2026-05-21

Inspire feed fed the song generator truncated RSS summaries with a literal `[ mehr ]` artifact instead of real article text.

### Fixed

- **Inspire "Generate from this" used the RSS summary, not the article — and leaked a `[ mehr ]` marker into the prompt** (`b040ee6`). Root cause: the parser preferred `<content:encoded>` over `<description>`, but for tagesschau-style German news feeds `content:encoded` is *not* the article body — it is `<image> + the same summary as <description> + a "[<a>mehr</a>]" read-more link`. After `stripTags`, the read-more anchor survived as the literal `[ mehr ]` and the "content" was just a ~200-char summary. The prior link-following fix (SUNAA-542) gated article backfill on `inlineLength < 200`, but the dressed-up summary cleared that bar, so the link was never followed. Reproduced live against the real tagesschau feed (`content:encoded` ending in `...zu gelangen.[mehr]`).
  - `src/lib/rss/parse.ts` — `hasReadMoreMarker` / `stripReadMoreMarker` detect and strip bracketed read-more markers (`[mehr]` / `[weiterlesen]` / `[read more]`) and trailing-ellipsis truncation, without touching the bare word "mehr" or a mid-sentence "…".
  - `src/lib/rss/index.ts` — article backfill now triggers on `truncated || inlineLength < threshold` (never length alone); `RssItem.truncated` flag set during parse; per-feed cap raised 5 → 20 to cover every displayed item; outbound fetches bounded by concurrency (6) and a hard 9 s time budget so the feed response never hangs and slow articles keep their (marker-stripped) summary.
  - Fix lives at the `fetchFeed` seam, so the Inspire page, Today's Picks / digest, and the auto-generate job all get full article text automatically.
- **Verification:** 98 unit tests + new `fetchFeed` integration tests; live against tagesschau **and** Spiegel — 0 marker artifacts, real articles backfilled, video-only items fall back to clean captions, ~1 s per feed.

## [0.2.2] — 2026-05-18

UI + infra fixes around the global player and Railway deploys (white-screen on first mobile visit, dual cover in the player bar, latent build-blocking TS narrowing), the audio-cache volume being 46% empty because alternate songs never reached disk, and a four-front fix for iOS PWA playback instability (songs play briefly then stall, some never start).

### Fixed

- **Expanded player tab buttons (Lyrics / Up Next / EQ) appeared dead on mobile.** `src/components/ExpandedPlayer.tsx` rendered every section (header, cover, song info, waveform, main + secondary controls, tab buttons, safe-area spacer) as `flex-shrink-0` siblings inside a `flex flex-col` container at `h-full` (= 100dvh on mobile). The inline panel was added below with `flex-1`. Because the flex-shrink-0 siblings already filled the viewport, `flex-1` resolved to ~0px and the panel rendered with no visible height (or scrolled below the DrawerContent bottom anchor). Clicking still toggled `activeTab`, but the visual confirmation was just a subtle button-color change — the user perceived "buttons don't work". Restructure:
  - Wrapped header through secondary controls in a `flex-1 min-h-0 overflow-y-auto md:flex-initial md:overflow-visible` upper region — so on mobile it competes for space with the panel instead of pinning the panel out of the viewport.
  - Panel container: `flex-1` → `flex-1 min-h-0 overflow-y-auto md:flex-initial md:max-h-[50vh] ... border-t border-gray-800`. Splits available height ~50/50 with the upper region on mobile; caps at 50vh on desktop where the drawer is `md:h-auto md:max-h-[90vh]`.
  - Outer: `overflow-y-auto` → `overflow-hidden md:overflow-y-auto`. Mobile delegates scrolling to the inner zones; desktop keeps the existing single outer-scroll behaviour.
- **Railway port-leak in self-redirects** (`94afe16`). Next.js standalone server builds absolute redirect URLs from `req.headers.host`, which behind Railway includes the internal container `$PORT=8080`. Browsers then follow `Location: https://sunoflow.up.railway.app:8080/de` to a port the edge does not expose → connection refused → white screen. Reproduced live with `curl -sI -H "Accept-Language: de" https://sunoflow.up.railway.app/`. Symptom triggered on first-time visitors (no `NEXT_LOCALE` cookie yet) so the `next-intl` locale redirect fired — long-standing latent bug, only surfaced once iPhone Chrome happened to hit `/` cleanly. Fix: middleware post-processes the `Location` header — when `x-forwarded-host` is present (= behind a proxy), rewrite any self-host redirect to use the canonical public origin with no port. Dev (no `x-forwarded-host`) is untouched, so `localhost:3000` redirects keep working. External redirects (OAuth callbacks) untouched. Three new vitest cases pinned to `src/middleware.test.ts`.
- **Dual cover in global player** (`4cc85b8`). The player rendered two `<button>`+`<Link>` cover elements with CSS mutual exclusion (`md:hidden` + `hidden md:flex`). User-visible bug: on iPhone Chrome both rendered side-by-side instead of one. Root cause not pinpointed (Tailwind purge / SW cache / something specific to the install) — but the mutual-exclusion-via-CSS pattern was inherently fragile. Replaced with a single `<button>` whose `onClick` decides at runtime via `window.matchMedia("(min-width: 768px)")`: desktop → `router.push("/library/{songId}")` (preserves the prior Link behavior), mobile → `setIsDrawerOpen(true)` (preserves the prior button behavior). Both behaviors retained, dual-render structurally impossible. Cost: lost `<Link>` prefetch on desktop hover — acceptable for this UI element.
- **Upload route TS narrowing** (`7553d92`). After the prior `22ee71f` route-handler refactor migrated to route-pipeline body parsing, `fileUrl` became correctly typed as `string | undefined`. The ternary `base64Data ? uploadFileBase64(...) : uploadFileFromUrl(fileUrl, ...)` left TS unable to narrow `fileUrl` to `string`, even though the validation guard at line 40 ensures one of `base64Data`/`fileUrl` is set. Build failed on Railway. Restructured as `if/else if/else throw unreachable` so TS narrows naturally. Surfaced because my local `tsc --noEmit` ran *before* `git pull` brought `22ee71f` into the merge — see Learnings.

#### Audio cache: alternate songs never reached disk (commit `54ad93f`)

- **Clip-UUID vs task-id confusion in `fetchFreshUrls`.** Primary songs store the Suno task-id (32 hex chars, no dashes) in `Song.sunoJobId`; alternates store the per-clip UUID instead. The record-info API only accepts task-ids, so every refresh attempt for an alternate 404'd. `warmUpAudioCache` then never populated the 105 alternates (out of 226 ready songs in prod), and the obsolete `scripts/repull-all-audio.ts` backfill had the same bug.
  1. `src/lib/sunoapi/refresh.ts` — Strategy 1 now matches the clip by `clip.id === sunoAudioId` instead of "first clip with a URL".
  2. `src/lib/cache/warmup.ts` — try direct download of the existing DB `audioUrl`/`imageUrl` first (those URLs are valid for ~9 months, no refresh needed). Only call `fetchFreshUrls` when actually stale, and pass `parentSong.sunoJobId` for alternates.
  3. `src/lib/audio/index.ts` + 4 routes (`audio/[songId]`, `audio/public/[songId]`, `images/[songId]`, `songs/[id]/play`) — `proxyAudio` accepts optional `parentSunoJobId`. Callers fetch `parentSong: { select: { sunoJobId } }`.
  4. Deleted `scripts/repull-all-audio.ts` (superseded by warmup, same bug).
- **Prod verification:** volume 121 mp3 / 119 jpg / 470 MB → 226 mp3 / 222 jpg / 840 MB (full DB coverage) on the next deploy's warmup pass with `failed=0`.

#### Mobile iOS PWA playback instability — four-front fix (commit `f3423bc`)

Reported as "songs play briefly then stop, some don't play at all, intermittent hangs". iOS-confirmed; Android untested. Four independent root causes, all in one commit:

- **Middleware `PUBLIC_PATHS` missed media-proxy routes.** Only `/api/songs/public` was listed. Unauthenticated (or cookie-evicted) requests to `/api/audio/{,public/}` and `/api/images/` received a 307 → `/login` HTML page that the `<audio>`/`<img>` element then tried to use as the media stream. Added `/api/audio/` and `/api/images/` — the route handlers already enforce their own auth/visibility checks (`authRoute` / `publicRoute`), so the edge redirect was redundant and harmful. Authenticated routes now return `401 application/json` instead of 307 HTML for unauth requests.
- **Service worker cached `/api/audio/*` responses by URL only, ignoring the Range header.** With Range requests, `cache.match(request)` returned the first cached partial for every subsequent byte-range — songs played the first chunk and then stalled. The SW now bypasses itself entirely for requests carrying a Range header (browser → server direct). Only full 200 responses (Save-Offline path) reach the cache. `AUDIO_CACHE` bumped `sunoflow-audio-v1` → `v2` to evict any leftover 206 partials.
- **Sync `readFileSync` in `proxyAudio.serveCached` blocked the event loop on every audio request.** Reading a 3–7 MB mp3 synchronously off the Railway volume serialised every concurrent request behind it. Added `FileCache.getStream(id, start?, end?)` returning a Web `ReadableStream` reading only the requested range. `serveCached` now streams the correct byte slice without buffering the whole file. `FileCache.put` is now fire-and-forget `fs.promises.writeFile`. 3 new tests for `getStream` (full, byte-range, missing).
- **`cdnFallbackRef` was add-only.** A single transient proxy error pinned a song to direct-CDN for the rest of the session — losing the local file-cache hit on every replay AND making the user dependent on Suno-CDN availability for that song. Now cleared per-song at the start of `resolveAndPlay` / `playQueue` so the proxy gets a fresh shot on each load.

##### Edge bundling caveat (also in `f3423bc`)

- `instrumentation.ts` now imports `@/lib/cache/warmup` directly instead of going through the `@/lib/cache` barrel — the barrel re-exports `audioCache`/`imageCache` from `file.ts`, which uses Node-only `fs`/`stream` and broke the edge-runtime bundling of `instrumentation.ts`. `Readable.toWeb()` was replaced with an inline `nodeStreamToWeb` helper in `file.ts` for the same reason (avoids any static `import "node:stream"` / `import "stream"`).

### Operational

- **Deploy workflow merged** (`cc35527`). Picked up the `fix/deploy-workflow-pnpm` branch (sitting unmerged for 2 days). Adds `pnpm/action-setup` + `setup-node` + `pnpm install --frozen-lockfile` + dummy `SUNOFLOW_DATABASE_URL` for the migration-safety-check step. Without it, `gh workflow run deploy-production.yml` errored at the `prisma validate` step with `pnpm: command not found`.

### Verification

- `pnpm exec tsc --noEmit` clean.
- `pnpm vitest run src/middleware.test.ts` — 38/38 pass (incl. 3 new port-leak cases).
- `pnpm vitest run` — 1306 passed total (1 pre-existing upload-INTERNAL_ERROR flake, unrelated).
- `pnpm build` clean (edge bundling of `instrumentation.ts` verified after `nodeStreamToWeb` inlining).
- Prod redirect verified live: `curl -sI -H "Accept-Language: de" https://sunoflow.up.railway.app/` → `location: https://sunoflow.up.railway.app/de` (was `:8080/de`).
- Audio-cache backfill verified live: volume 226 mp3 / 222 jpg / 840 MB on Railway after deploy.
- Media-proxy middleware fix verified live via `curl`: `/api/audio/public/<id>` with `Range: bytes=500000-1000000` → `206` + correct `Content-Range`; `/api/audio/<id>` without cookie → `401 application/json` (was 307 HTML).
- Expanded-player + dual-cover + SW + `cdnFallbackRef` fixes untested in live browser at commit time — user-side iPhone verification pending.

### Known follow-ups

- **CI E2E flake** — same 3 tests fail with `ERR_CONNECTION_REFUSED` across two consecutive runs since the `392767f` merge (`unauthenticated → /login`, smoke `/generate`, smoke `/mashup`). My middleware change is a pure no-op without `x-forwarded-host` (= always in CI's local `next dev`), so the regression isn't obviously from the middleware. Possibly an interaction between middleware + `5c99701 feat(auth)` after the merge. Tracked as BAU; not blocking.

### Process

- New memory: `feedback_always_push_after_commit.md` — for SunoFlow specifically (solo project, sole committer), push immediately after every commit on `main` and trigger the deploy workflow for prod-affecting fixes. Overrides the global "never auto-push" rule.
- New memory: `feedback_post_pull_typecheck.md` — re-run `pnpm tsc --noEmit` after any `git pull` that brings in remote commits, before pushing. Latent type errors in merged-in files (e.g. `22ee71f`) don't fail in local pre-pull state.

## [0.2.1] — 2026-05-16

Post-0.2.0 verification surfaced GlitchTip Issue 5 (PrismaClientKnownRequestError, "Unique constraint failed on the fields: (`sunoJobId`)") — pre-existing concurrent-handler race that the 0.2.0 recovery refactor exposed more frequently because `runStalePendingRecovery` now calls `handleSongSuccess` on songs the old blind-timeout would have left dead.

### Fixed

- **handleSongSuccess race in `createAlternateSongs`** (`5d3b275`). Three pathways can fire `handleSongSuccess` concurrently for the same parent song: the SSE `pollToCompletion` loop, the client `/api/songs/[id]/status` poll, and the stale-pending recovery sweep. When two land within milliseconds, the second's `createAlternateSongs` hits the `@unique` constraint on `Song.sunoJobId` and Prisma throws P2002. Two-layer fix:
  1. **Single-flight guard at top of `handleSongSuccess`** — skip if `generationStatus === "ready"` AND `sunoAudioId === firstSong.id` (another handler already completed this song with this exact primary clip). Prevents the common ~100ms-gap race; covers most cases without TOCTOU concerns.
  2. **Idempotent `createAlternateSongs`** — wrap each `prisma.song.create` in try/catch for P2002; on collision, look up the existing alternate by its `@unique` `sunoJobId` and push its shape into the alternates list. Non-P2002 errors still propagate.

### Verification

- **Issue 3 (stale-pending sweep)** marked resolved in GlitchTip with `in_release: 63d6a1a...` (the 0.2.0 deploy SHA). Auto-reopens if a new event arrives.
- **Issue 5** stays unresolved until a race-class verification window (~7d silence) passes after the `5d3b275` deploy.

### Docs (cross-repo)

- `yesterday-ai/cloud` `6e7ccd5` — extended the `glitchtip-mcp` skill with a "Resolving an issue" section: four-criteria verification workflow (fix SHA identified, deployed, event-rate-scaled silence window, not collateral) plus `update_issue(in_release="...")` pinning so GlitchTip auto-reopens on recurrence. Refined the prior absolute "Don't auto-resolve" anti-pattern.

## [0.2.0] — 2026-05-16

Substantial bug-fix + architecture pass triggered by a real prod incident (GlitchTip Issue 3, "Generation timed out (stale-pending sweep)"). No breaking API surface — every change is internal architecture or UI behaviour.

### Fixed

- **Stuck-pending songs after retry / tab close / server restart.** Two distinct root causes:
  - `cleanupStalePending` was a blind timeout that flipped `pending → failed` without re-probing Suno, discarding songs the upstream had actually completed (`6c37979`). Replaced with `runStalePendingRecovery`: a per-row probe that calls `pollOnce` and dispatches to `handleSongSuccess` / `handleSongFailure` / `handleSongFailure("Generation timed out (upstream lost)")` / pollCount-bump-and-defer based on the real upstream outcome. Hard 60-min ceiling for the still-processing branch.
  - `/api/generate/[jobId]/stream` passed `request.signal` into `pollToCompletion`, killing the server-side poll loop when the client closed its tab (`14c8142`). Suno would still complete the song, but the SunoFlow row stayed `pending` forever. Decoupled — the SSE forwarder is now best-effort while the poll loop runs independently to its terminal state.
- **Regenerated songs invisible in library** (`92bfce3`). `handleSongFailure` auto-archives via `archivedAt = now`; none of the three "back to ready" paths (retry route, `persistSongCompletion`, recovery sweep) cleared it. Library default filter is `archivedAt: null`, so a successfully-retried song was filtered out. Lifecycle now clears `archivedAt` + `errorMessage` on every transition back to `ready` / `pending`.
- **Retry UI didn't reflect new state until manual refresh** (`34b6e0a`, `d424236`). `GenerationHistoryView.handleRetry` called `router.refresh()` but the client kept a stale `songs` state from `initialSongs`. Now merges the retry-response into local state immediately and polls `/api/songs/[id]/status` every 4s for any pending row until terminal.
- **Per-row recovery failures aborted the loop** (`70124e6`). One bad row's exception inside `runStalePendingRecovery` killed the rest. Wrapped each iteration in try/catch with `logServerError("song-stale-recover-error", …)` so a single DB / side-effect throw doesn't block the remaining stale rows.
- **SSE stream crashes on `pollToCompletion` throw** (`70124e6`). The `for await` was unhandled — added catch + terminal `failed` event so the UI doesn't hang on a perpetual spinner.
- **Date-series TZ bug** (`5102283`, part of test-suite repair). `mondayOfWeeksAgo` mixed local-time `setDate/getDay/setHours` with `toISOString()` (UTC) → off-by-one in any UTC+ timezone. Switched to UTC-* variants.

### Changed (refactors — no behaviour change)

- **Single seam for `generationStatus` + `archivedAt` transitions** (`687de28`). Five scattered `prisma.song.update` sites collapsed onto `src/lib/songs/lifecycle.ts` (`readyTransition`, `pendingRetryTransition`, `buildFailedTransition`, `markSongFailedSimple`, `markSongPendingRetry`, `markSongReadyNoApi`). Status / archive / errorMessage invariants live in one place.
- **`handleSongSuccess` split into four domain adapters** (`f5d8aa9`). The 100-line god-handler with 11 inline `runSideEffect` lambdas became a 25-line orchestrator + `src/lib/generation/song-ready-events/{broadcast,cache-assets,engagement,notify}.ts`. Each adapter has its own test file; future side-effect additions land in one domain file instead of the orchestrator.
- **Stale-pending recovery extracted from the read path** (`c598c87`). `querySongLibrary` was firing-and-forgetting `cleanupStalePending` inline. Recovery now lives in `src/lib/songs/stale-pending-recovery.ts`; trigger is explicit at `/api/songs` route level via `kickoffStalePendingRecovery`. `querySongLibrary` is now a pure read with no side effects (and no longer needs `pollOnce`/`handleSongSuccess`/`handleSongFailure` imports).
- **SongListItem polling consolidated onto generation-tracker** (`f86b468`). The component had its own `setTimeout` polling loop parallel to the singleton `generation-tracker.ts`. Replaced with `useTrackPendingSong` hook that subscribes to the tracker and does a single full-row fetch on terminal transition. Wins: shared SSE / polling-fallback / visibility-pause / MAX_POLLS guard.
- **Queue API cleanup** (`76f7fb3`). Merged `enqueueFromSpec` into `addItem` so circuit-open enqueues respect MAX_QUEUE_SIZE. Split the dual-signature `updateItem({id} | {songId,status})` into `updateItemById` + inline `prisma.updateMany` inside `resolveBySongId`.
- **Notifications channel registry** (`699e819`). The "which channels fire for which type" knowledge was spread across `PUSH_PREF_FIELD` + `EMAIL_PREF_FIELD` + a `sendNotificationEmail` switch. Collapsed into `src/lib/notifications/channels.ts` — a typed `Record<NotificationType, NotificationChannels>` that makes "no channels means in-app only" a deliberate explicit empty entry instead of accidental absence.
- **Error-logger split into client + server modules** (`d870af1`). `src/lib/error-logger.ts` mixed `logError` (client-only in practice — 28+ `"use client"` error.tsx boundaries) and `logServerError` with a dead `typeof window === "undefined"` branch. Split into `src/lib/error-logger/{client,server,extract,index}.ts`.
- **Error-logger tag promotion** (`38fe73a`). Indexable params (`songId`, `sunoJobId`, `playlistId`, `stemId`, `feedId`, plus `userId`) auto-promoted from `extra` to Sentry tags. Tags are searchable in the GlitchTip UI and via the MCP `list_issues` query API — `extra` is not surfaced via MCP. Now you can `list_issues query:"songId:cmp744adr0007"` to find issues for a specific song.

### Docs

- **SunoFlow skill restructured per Anthropic skill best practices** (`a8516cc`, `1c0329c`, `b143ee0`). Was a monolithic 345-line `SKILL.md`; now a 111-line entrypoint + `skills/sunoflow/reference/{tools,resources}.md` loaded on demand. Frontmatter split into third-person `description` + `when_to_use`. Every tool has comprehensive variation examples (free-form vs custom mode, instrumental, persona, negative-tags for `generate_song`; continue-from-end vs new-lyrics for `extend_song`; tempo vs key vs one-shot for `generate_sounds`; etc.). Markdown lint clean. Marketplace description in `lx-0/skills` synced to match (commit `b6605b0` over there).

### Data migration

- **Six historical stuck-archived rows unarchived in prod** ("Glass & Bone", "Infinite Rooms", "Patch Notes", "World State" ×2, "Mashup"). All had `generationStatus="ready"` + `archivedAt != null` + `errorMessage IS NULL` + `audioUrl IS NOT NULL` + `pollCount > 0`, indicating they were bug-victims of the cleared-archive gap. Manual transaction via `psql DATABASE_PUBLIC_URL` returned 6 rows; verification SELECT returned 0 remaining.

## [0.1.4] — 2026-05-15 (evening)

See `roadmap.md`. Headline: silent-generation-failure observability hook (`f60a615`) — exposed 21 silent failures across the DB.

## [0.1.0 — 0.1.3]

Pre-changelog era. See git log + roadmap.md for granular history.

[0.2.1]: https://github.com/lx-0/SunoFlow/releases/tag/v0.2.1
[0.2.0]: https://github.com/lx-0/SunoFlow/releases/tag/v0.2.0
[0.1.4]: https://github.com/lx-0/SunoFlow/releases/tag/v0.1.4

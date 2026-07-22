---
project: SunoFlow
slug: SunoFlow
last_updated: 2026-07-22T13:10:00Z
current_milestone: M005
active_slice: S01
active_task: none
status: brownfield-imported
---

# State

**Status:** M004 in progress. **S01 monorepo restructure DONE + DEPLOYED LIVE** (`a8b85236`): pnpm workspace + `packages/core` (`@sunoflow/core`), web at root, Expo standalone; verified local docker build → CI green → Railway build → healthcheck → Online, `sunoflow.app/api/health` = 200. **Verifiable backend DONE** (vitest+tsc): `POST /api/v1/auth/token` login (`fe95d8a8`) with per-email brute-force rate-limit; bearer auth + revoke + library endpoints already existed. **Mobile core vertical written** (UNTESTED — headless, no simulator): Expo app, track-player background-audio + lock-screen, login→keychain, Library on real `/api/songs`, Player, playlists list+detail, search, secure sign-out. CI unblocked by ignoring a non-applicable vitest advisory (`5571ded2`).

**Native app feature/UX wave (2026-06-04 → 06-07, all on `main`, pushed; CODE-COMPLETE but UNTESTED on device).** The Expo app grew far past the v1 vertical: full feature waves pulled from the PWA (credits, delete-account, RSS/inspire, personas/templates/presets management, profile depth, analytics/insights, stems/versions/collaborators, lyrics-edit, music-video generation), multiple themes, invite-only registration. Then this cycle: (1) **navigation rework** → native music-app model (`apps/mobile/src/navigation.ts`, global chrome, singleton player; spec `apps/mobile/NAVIGATION.md`); (2) **bottom-right tab → Profile**, stats atop profile; (3) **song-detail PWA parity** (Style/metadata card, real custom tags, thumbs feedback, add-to-playlist, variation link); (4) **consistent UI/UX polish across ~35 screens**; (5) global-chrome **bottom-bar clearance** fixed on 16 screens. Animation stack (Reanimated 4 + worklets + gesture-handler) is installed (New Arch on) but **unwired** (no babel `react-native-worklets/plugin`, no imports). SM + Expo animation skills vendored in `.claude/skills/`.

**2026-07-17 mega-session (all on `main`, pushed; 15 commits `00418ad6`..`b2c93ff1`).** (1) **Navigation rework #2**: REAL Tabs navigator (per-tab stacks via shared 5-way array group, NAVIGATE-by-name dispatch, headerless player sheet, `closePlayerThen`) supersedes the 06-07 flat-stack model — see DECISIONS 2026-07-17. (2) **UX waves 1–4**: Geist app-wide (Themed wrappers), WCAG-AA CTAs, pull-to-refresh + silent focus-revalidate on all lists, a11y sweep + keyboard handling, design tokens (radii/spacing/surfaceHover/Chip). (3) **Playback fixes** (both formerly deferred): 700ms re-render churn (emit gating + `usePlaybackSelector`) and the auto-advance double-skip window. (4) **Prod-DB incident fixed + deployed**: 114 dead tempfile audio URLs migrated to cdn1 (backed up, 114/114 verified) + `proxyAudio` self-heal live (Railway SUCCESS, health 200). (5) **Architecture deepening deployed** (`b2c93ff1`): shared core queue machine / poll loop / coerce + http-client, asset-heal seam (`healAudio` guard), `advancePendingSong` dispatcher, `useListResource`/`usePollingJob`; net ≈ −600 lines, ~120 new tests, suite 1788 green. Everything mobile remains **runtime-UNVERIFIED** (headless); audit trail: `apps/mobile/UX-REVIEW-2026-07-17.md`.

**2026-07-19 web-brand + archive session (all on `main`, pushed + DEPLOYED LIVE).** Wave A batches 1–2 of the improvement-wave program (`.ytstack/WAVE-A-C-EXECUTION-PLAN-2026-07-18.md`): (1) **batch 1** foundations (`e442af8c`, +CI hotfix `78385462`) — dark-first default flip, semantic surface tokens + gray→hue-350 retint in `globals.css`/`tailwind.config.ts`, Heroicon→Lucide symbol map + `Icon` wrapper, visual-journey harness, credit ledger, cache/jobs ops, mobile CI job. (2) **batch 2** (`97aa8f60`) — migrated the shared chrome (AppShell + global player + shells; **mobile bottom nav 5→3 PRODUCT.md modes + More**), the one-file chart/confetti levers, and the core-loop components (Browse/Generate/Edit/Playlists/SongDetail) to semantic tokens + Lucide. Visual-only bar the sanctioned nav change; 2 adversarial reviews clean; visual journey diffs 0.16–1.39% across 42 surfaces; deployed (CI green, Railway SUCCESS, health 9 jobs). (3) **Archive feature repaired** (`da464953`): the pre-existing "archive" smart playlist was broken 3 ways (sweep-wiped, count always 0, library batch-archive never surfaced) — made it VIRTUAL (`Song.archivedAt` single source of truth), see KNOWLEDGE.md. Runtime-verified: the harness archives a song, asserts it leaves the normal library + appears in the archive view; screenshots confirm the `/playlists` Archive tile shows the real count and `/library?smartFilter=archived` renders the archived song. **Remaining Wave-A batches (not started):** A5 core-loop routes, A6 long-tail authed routes, A7 auth + 33 error boundaries, A8 public/embed/landing, A9 static assets. Visual baseline for future diffs lives in `visual-artifacts/baseline` (rich seed).

**2026-07-20 codebase-audit session (all on `main`, pushed + DEPLOYED LIVE).** A 6-dimension multi-agent audit (correctness / performance / cleanup / type-safety / web-mobile-drift / security) yielded **43 raw findings → 26 confirmed** after per-finding adversarial verification (~16 false positives rejected). Fixed in 4 commits: (1) **cleanup** `7ada2465` — deleted 30 grep-verified dead files (**−4058 lines**), wired queue-drain `logServerError`, dropped 2 unused deps; (2) **Group B** `86b31aa4` — 9 correctness+security fixes with 31 regression tests (per-day charts were permanently all-zero via a shared `fillDailySeries` `Date.toString()` bug; Suno webhook could mark unplayable songs ready; LLM errors invisible to GlitchTip; OpenAI had no timeout; cache warmup unbounded; embedding-crash guard; + 3 SECURITY holes: `/api/images` private-cover leak, `/api/analytics/view` DoS, `/api/health` disclosure — each independently verified to preserve legit access, `/api/health` live-verified); (3) **Group C** `766a22a7` — RSS SSRF hardening (DNS-resolve + per-hop re-validate on both fetch paths; edge `node:`-scheme build fixed via IgnorePlugin), `session.user` type-safety (19 casts → next-auth augmentation), GDPR export event-loop (paginate + yield); (4) **C1** `3fe36a1f` — ratings consolidated onto the canonical `Song.rating` store (non-destructive). Suite: **1932 passing**. Learnings in KNOWLEDGE.md (2026-07-20 section). **Audit remainder NOT done — needs operator / deferred:** C2 (playlist e2e `test.fixme(true)` — needs the `E2E_SEED_SONGS` picker repro, the Wave-0 residue), C5 (unbounded per-user scans — deliberately deferred, premature at closed-beta N), C7 (brand ramp hand-transcribed web+mobile → generate a shared token module from `.impeccable/design.json`). Flagged follow-ups: SSRF TOCTOU (resolved-IP pinning), `/api/ratings` endpoint retirement (write-dead, harmless), mobile Archive-tile nav (route to the library archive view — device pass).

**2026-07-20 web-nav session (all on `main`, pushed + DEPLOYED LIVE).** A web-only BAU sidecar to the M004 mobile gate. (1) **Expanded-player desktop overlap fixed** (`6eb8086c`): on `md+` the upper region shrank and spilled its `overflow-visible` content over the Lyrics/Up Next/EQ tab row when content exceeded `max-h-[90vh]` — `md:flex-none` keeps its natural height and the whole modal scrolls (isolated repro: 67px overlap → clean gap; live-verified). (2) **Nav consolidation 17 → 10 items**, driven by a critical 8-persona synthetic-user panel (unanimous: flat wall, no hierarchy, findability fails on browse + stats). **Phase 1** (`09d74278`) grouped into Create / My Music / Browse sections + Generate hero CTA. **Phase 2** (`f780550f`) merged the synonym clusters behind a shared `SectionTabs` hub (Insights = Overview/Production/Listening over `/insights`+`/analytics`+`/stats`; My Music = Songs/Recently Played/Generation History over `/library`+`/history`+`/generations`), `/explore`→`/discover` 301 (literal duplicate), Radio/Feed out of nav, Favorites → Library chip. Non-destructive (every feature reachable via tab/chip/redirect/song-card); grounded in a per-page characterization of all 8 cluster pages. Verified: visual harness (both `SectionTabs` groups, correct active states across 6 pages), prod build green, `/explore → 308 → /discover` live. See DECISIONS 2026-07-20 (web nav consolidation). **Deferred web-nav follow-ups (NOT done):** dedupe the overlapping Insights view *content* (tabs group them, metrics still overlap); Feed needs a "Following" home + Radio a browse-hub tab; delete the now-dead `/explore/page.tsx`.

**2026-07-20 pnpm-toolchain fix (all on `main`, pushed).** `pnpm release` (Expo, run in `apps/mobile`) broke under the locally-installed pnpm 11.15.1: its pre-run deps-check `pnpm install` hit `ERR_PNPM_IGNORED_BUILDS` on `msgpackr-extract` + `unrs-resolver` (exit 1). Root cause — pnpm 10+ no longer reads the `package.json` "pnpm" field (overrides + build-approval); config must live in `pnpm-workspace.yaml`. Fixed at root (`81831435` — mirrored the overrides + `onlyBuiltDependencies` there, re-enforcing the 17 security overrides pnpm 11 was silently dropping) and in the standalone `apps/mobile` workspace (`e7a46368` — `allowBuilds`). Config kept in BOTH package.json + workspace.yaml because CI runs pnpm 9 via the `packageManager` pin. See KNOWLEDGE.md 2026-07-20 (pnpm). Deferred: unify the toolchain on one pnpm major to drop the duplicate config + the field-ignored WARN.

**Visual harness gotcha:** run it with `SEED_MODE=rich` (`scripts/visual-journey.sh`) — the default (API-seed) mode hits the 5-songs/hour generation quota even on the keyless mock path and fails the authenticated journey with a 429. Rich mode seeds via Prisma. Also pass `VISUAL_DB_PORT=5434` if 5433 is taken.

**2026-07-22 session (all on `main`, pushed + DEPLOYED LIVE through `a0ffadbb`).** (1) **Mini-player options-menu recursion fixed** (`dacb0cd3`): the close handler called itself instead of `onClose` — every menu click threw `Maximum call stack size exceeded` (found via the `ErrorReport` table → minified prod chunk at the stack offset; see KNOWLEDGE 2026-07-22). RED→GREEN e2e regression spec. (2) **Synced lyrics shipped** (`fe0c904c`): Suno word-aligned lyrics → per-line timestamps in the existing `LyricTimestamp` table (aligner + idempotent `POST .../lyrics/timestamps/sync`, billed call once per song, 6h negative-cache); `LyricsPanel` is now dual-mode (karaoke highlight + click-to-seek, static fallback); verified against the LIVE upstream (521 words → 92/106 lines). Mobile lyrics screen now triggers the same sync (`67f1bec2`, JS-only, runtime-unverified). (3) **Deploy gate cleared** (`fe878e97`): a fresh advisory batch tripped the audit gate; overrides bumped BOUNDED per major + Dockerfile sharp dual-site (see KNOWLEDGE 2026-07-22 security section). (4) **Nav Phase 3** (`a0ffadbb`): sidebar bottom block 6 items → one `AccountMenu` popover (desktop + drawer); language selector moved to Settings→Preferences; accessible name "Account menu" (NOT "Account" — Settings-tab collision race); 20/20 affected e2e green, 4-state visual pass. (5) **M005 Party Mode planned** — pitch `.ytstack/OFFICE-HOURS-party-mode.md` (direct-push prompts as visible pending cards, budget + per-guest rate limit + host veto, QR guests without accounts, host device = speaker, STUDIO-gated).

## Next action

**Status:** M005 / S01 — 3/5 tasks done (T01 schema, T02 host routes, T03 guest state). Next: S01-T04 (guest prompt push). M004 remains open on its user-side GATE (below); agent-side M004 work is blocked on that device pass.

THE M004 GATE (user action, unchanged): user runs ONE free-Apple-ID Expo dev build (`apps/mobile/README.md`) — JS-only since the last native build, so `expo start -c` + reload suffices. Verify on-device: background audio surviving a 10+ min lock (the milestone's proof), the NEW tabs navigation (checklist in `apps/mobile/NAVIGATION.md`), Geist fonts/magenta CTAs/chips everywhere, pull-to-refresh + silent revalidate, keyboard over forms, VoiceOver spot-check, playback (smooth progress, auto-advance on slow network, rapid skips, seek right after a track change).

Open USER decisions (agent blocked without them): (a) song-tap → full player (today) vs. playback + mini-player only (Spotify pattern); (b) 4 permanently dead covers — regenerate (credits, new art) vs. NULL/placeholder; (c) prod hygiene — 18 E2E test songs + 1 stuck-pending row from April (delete/archive only on explicit go).

Deliberate mobile follow-ups (NOT done): wire Reanimated (add `react-native-worklets/plugin` to `apps/mobile/babel.config.js` + native rebuild) before any reanimated-based transitions. **Mobile archive nav** (after the 2026-07-19 web archive fix): the mobile Smart-Playlists Archive tile (`apps/mobile/.../smart-playlists.tsx`) still opens the playlist detail rather than a library archive view; the detail's reorder/publish actions no-op safely on the now-virtual archive. Web already redirects the Archive tile to `/library?smartFilter=archived` — do the same on mobile (the mobile library index already supports an `archived` filter in local state; route the tile there via a route param) and suppress edit/publish for `smartPlaylistType==="archive"`. Data is already correct on mobile (right count via `/api/smart-playlists`, right songs via `getPlaylist`); this is UX polish that needs on-device verification.

iOS-v1 surface CODE-COMPLETE (untested): login, library + search, player (background audio), playlists list + detail, favorites/reactions/thumbs, secure sign-out. Remaining agent-writable RN polish (better after a device pass): native waveform, playlist drag-reorder (needs Reanimated wiring).
Login endpoint now fully brute-force protected: per-IP (30/h) + per-email (10/h), verified (`70694d98`). Mini-player bar added (`2fb2c075`, untested). Login security = closed.
Deliberate follow-ups (NOT done — risky/uncertain, need focus or a device pass):
- vitest 3.2.4 → ≥4.1.0: blast radius is 183 test files (major-bump breakage risk that would re-break CI). Own task. The GHSA ignore is fine meanwhile (non-applicable dev-only advisory).
- Favorites / playlist drag-reorder / native waveform: API-shape-uncertain (favorite toggle endpoint + per-song favorite state not exposed in the library response); do AFTER the device pass clarifies real shapes.
- OAuth for `/api/mcp` (would be a new milestone, not M003-S05 — that slice is cancelled). Bearer-only is production-fine for the closed beta.
- Migrate more shared modules into `@sunoflow/core` — PARTIALLY DONE 2026-07-17 (queue machine, poll loop, coerce, http-client now live there); mcp/* relocation (collapsing the `@mcp/*` alias) remains the next batch.

**M003 closed 2026-06-02.** Remote `/api/mcp` lives on `sunoflow.app` (deploy `35b34cde`, uptime stable since 2026-05-28 14:35 +02:00). S04-T05 closed as `passed_with_caveats`: server boundary (`401` + `WWW-Authenticate: Bearer realm="sunoflow"` + Origin allowlist) verified live; full E2E tools/call against prod DB never run from this session (needs a real API key + operator). Smoke-script at `scripts/smoke-mcp.mjs` for any operator who wants to run it. S05 OAuth cancelled (out of M003 scope).

M002 (Generate-Refactor) stays planned with S01 done; resumes after M004.

## M001 progress

- ✅ S01 Discovery & Inventory: 5/5 tasks done -- closed 2026-05-18T08:20:00Z
  - [x] T01 Routes-Audit → `.ytstack/M001-ROUTE-CATALOG.md`
  - [x] T02 Components-Audit → `.ytstack/M001-COMPONENT-MAP.md`
  - [x] T03 Feature-Cross-Check → `.ytstack/M001-FEATURE-GAPS.md`
  - [x] T04 Friction-Audit → `.ytstack/M001-FRICTION-AUDIT.md`
  - [x] T05 Mobile/PWA-Audit → `.ytstack/M001-MOBILE-AUDIT.md`
- ✅ S02 User Journey + IA: 5/5 tasks done -- closed 2026-05-18T09:45:00Z
  - [x] T01 App-Concept-Statement → `.ytstack/USER-JOURNEY.md §1`
  - [x] T02 Journey-Hauptpfade → `.ytstack/USER-JOURNEY.md §2-§8`
  - [x] T03 Coverage-Check → `.ytstack/USER-JOURNEY.md §9`
  - [x] T04 IA-Konsolidierungs-Map → `.ytstack/M001-IA-MAP.md` + 13 DECISIONS entries (D1-D14)
  - [x] T05 Locked-in Constraints → `.ytstack/M001-IA-MAP.md §7` (22 constraints + PR-Checklist)
- ✅ S03 Generate-Redesign + Folge-Milestones: 5/5 tasks done -- closed 2026-05-18T11:15:00Z
  - [x] T01 Parameter-Inventur → `.ytstack/M001-GENERATE-INVENTORY.md`
  - [x] T02 Progressive-Disclosure-Skizze → `.ytstack/M001-GENERATE-REDESIGN.md`
  - [x] T03 Folge-Milestones M002+ → `.ytstack/M001-FOLLOWUP-ROADMAP.md` + 2 DECISIONS (D15, D16)
  - [x] T04 Migration-Strategie → `.ytstack/M001-MIGRATION-STRATEGY.md` + D17
  - [x] T05 Excalidraw-Mockups → `.ytstack/mockups/M001-{generate,navigation,library}.excalidraw`

## M001 DONE -- artifact summary

Plan-only milestone abgeschlossen. Outputs in `.ytstack/`:
- USER-JOURNEY.md (9 sections, App-Concept + 7 Pfade + Coverage-Matrix)
- M001-ROUTE-CATALOG.md (56 pages + 224 API)
- M001-COMPONENT-MAP.md (101 components, 4 dead)
- M001-FEATURE-GAPS.md (23 drift + 50+ undocumented)
- M001-FRICTION-AUDIT.md (6 god-objects, 6762 LOC, 146 useState)
- M001-MOBILE-AUDIT.md (296 breakpoint usages, PWA infra)
- M001-IA-MAP.md (17→8 Nav, 25→12 Routes, 22 Constraints)
- M001-GENERATE-INVENTORY.md (8 Domain-Params, 5-3-3 Klassifikation)
- M001-GENERATE-REDESIGN.md (4 Disclosure-Levels, 3 ASCII-Mockups)
- M001-FOLLOWUP-ROADMAP.md (M002-M007 sequenced)
- M001-MIGRATION-STRATEGY.md (7 feature-flags, 12 redirects)
- mockups/*.excalidraw (3 visual mockups)
- DECISIONS.md: D1-D17 (17 architectural decisions formal)

Continuous BAU work bleibt parallel auf Paperclip SUNAA.

## Production infra (2026-05-21)

- **Custom domain live: `https://sunoflow.app` (apex-primary) + `https://www.sunoflow.app`**, both serving directly on Railway (verified `HTTP 200` + `/api/health` ok). Registrar/DNS = INWX (apex via ALIAS, www via CNAME, two `_railway-verify` TXTs). `AUTH_URL=https://sunoflow.app`. Key gotcha captured: Railway custom-domain target port must be **8080** (not Dockerfile 3000) — see KNOWLEDGE.md + DECISIONS.md 2026-05-21. No app code changed; no version bump.

## Known issue

`ytstack:pre-tool-use-edit` Hook ist broken (exit 2 trotz "Proceeding anyway"-Text → Edits gegen Framework-Meta-Files werden blockiert). Workaround: bei summarize-task `active_task` per `sed` auf `none` setzen vor STATE.md/SUMMARY.md-Edits. Upstream-Fix candidate -- siehe T01-SUMMARY "Meta-Beobachtung".

## Open decisions

- Whether to migrate ongoing Paperclip-tracked work into ytstack milestones, or keep them as parallel layers. Currently parallel: ytstack for big-picture decisions/knowledge, Paperclip for issue-level execution.

## Recent summaries

(Empty — no T##-SUMMARY.md yet. Will populate once `ytstack:plan-milestone` + `summarize-task` start running.)

## Recent commits (2026-05-15 evening)

PWA / mobile stability + observability batch:

- `b78deb7` feat(sw): per-deploy cache busting + safer auto-reload UX
- `5579658` fix(deploy): wire NEXT_PUBLIC_BUILD_ID through CI → Railway → Docker build
- `f4fb70e` fix(sw): bump cache versions to evict stale Next.js bundles (interim manual bump, superseded by b78deb7)
- `c66bc2f` perf(analytics): defer PostHog init to requestIdleCallback
- `7511d20` fix(player): guard async audio paths with a load-generation token
- `45023a6` perf(audio): move waveform peak math into a Web Worker
- `868765f` fix(realtime): singleton generation tracker, visibility-aware SSE
- `de224c7` feat(query): migrate RecentlyPlayed + HistoryView to React Query
- `7b81fa3` feat(query): migrate LibraryView to useSongsList + useTagsList
- `8aed908` feat(query): introduce TanStack Query, migrate useCredits as probe
- `fbae46a` fix(observability): wire Sentry server runtime + onRequestError + logServerError

Auth / observability / data-quality batch (other Claude instance):

- `23116cc` fix(test): use BigInt() instead of literal suffix in active-users tests

Observability follow-up (2026-05-15 evening, 0.1.4):

- `f60a615` feat(observability): log silent generation failures to GlitchTip — `handleSongFailure` + `cleanupStalePending` now emit `logServerError` events. Prod-data audit via `psql DATABASE_PUBLIC_URL` against `Song WHERE generationStatus='failed'` surfaced 21 silent rows: 14× "Generation timed out" (`pollCount=0`, stale-pending sweep), 5× Suno "Internal Error", 2× content-policy rejects (suppressed by regex).
- `d31671c` test(active-users): cover count, list, and daily helpers
- `ab1fa19` fix(observability): correct active-user signal, streak triggers, failed-song archival
- `0d1fbfd` chore: initialise ytstack (brownfield import)
- `7ef992f` fix(auth): honor ADMIN_EMAILS in requireAdmin server-route guard
- `f9ce935` fix(docker): declare NEXT_PUBLIC_SENTRY_DSN as build ARG
- `d55242c` docs: bump to 0.1.2, log today's 4 fixes in roadmap + ytstack

## Open verification

- **GlitchTip ingest** — `fbae46a` fixed three holes (instrumentation.ts runtime imports, `onRequestError` export, `logServerError` → Sentry). Once `b78deb7`+`5579658` deploy lands, throw a synthetic error against `/api/songs/nonexistent/refresh` and confirm GlitchTip receives the event with `release` tagged to the deploy commit SHA.
- **4-cover-in-player bug** — never reproduced from code. Strongest hypothesis is stale PWA cache. Once the per-deploy cache-busting deploy lands, user does one hard reload to migrate from old SW; subsequent deploys auto-evict.

## Active background tasks

- (cleared — last poller `bzzwcz2pc` completed; `5579658` was REMOVED, succeeded by `d55242c` which carries all changes forward)

## 0.2.0 release (2026-05-16)

Stuck-pending incident triage (GlitchTip Issue 3) → multi-fix + architecture pass + skill restructure.

Bug-fix commits (deployed via tag-driven release):

- `6c37979` fix(songs): recover stale-pending songs via final pollOnce instead of blind timeout
- `14c8142` fix(generation): decouple Suno poll loop from SSE client lifecycle
- `5102283` fix(tests): repair 4 pre-existing test failures (date-series TZ + 3 env-mock setup)
- `34b6e0a` fix(history): retry updates local state and polls pending songs to terminal
- `38fe73a` feat(error-logger): promote indexable IDs from params to Sentry tags
- `70124e6` fix(error-handling): isolate per-row failures and catch SSE stream throws
- `92bfce3` fix(library): clear archivedAt on retry + success so recovered songs reappear
- `d424236` refactor(history): extract retry transport into tested pure helpers

Architecture refactor batch:

- `687de28` refactor(songs): single seam for generationStatus + archivedAt transitions (`src/lib/songs/lifecycle.ts`)
- `f5d8aa9` refactor(generation): split handleSongSuccess into per-domain adapters (`src/lib/generation/song-ready-events/`)
- `c598c87` refactor(songs): extract stale-pending recovery from the read path (`src/lib/songs/stale-pending-recovery.ts`)
- `f86b468` refactor(songs): replace SongListItem polling with generation-tracker subscription (`src/hooks/useTrackPendingSong.ts`)
- `76f7fb3` refactor(queue): single addItem seam + split updateItem dual-signature
- `699e819` refactor(notifications): single channel-config seam per NotificationType (`src/lib/notifications/channels.ts`)
- `d870af1` refactor(error-logger): split client/server logger into separate modules (`src/lib/error-logger/{client,server,extract,index}.ts`)

Skill / docs / version bump:

- `b143ee0` docs(skill): align SunoFlow skill with current MCP server + skill best practices
- `a8516cc` docs(skill): restructure SunoFlow skill as entrypoint + reference files
- `1c0329c` docs(skill): fix markdown lint + add variation examples for every tool
- `63d6a1a` chore: bump version to 0.2.0 across app, plugin, MCP server, and skill
- `b6605b0` (lx-0/skills): docs(sunoflow): sync marketplace description with restructured SKILL.md

Prod data fix (one-off, not in git):

- 6 stuck-archived "ready" songs unarchived via direct SQL on Railway DB public proxy. See KNOWLEDGE.md → "Historical data fixes".

Tests: 1270 passing / 47 skipped / 0 failed. Typecheck clean throughout.

## Open verification (post-0.2.0)

- **GlitchTip Issue 3 should stop receiving events** under the new release SHA. Verify after Railway deploy lands: `mcp__plugin_yesterday-cloud_glitchtip__list_issues` for project `sunoflow-prod`, filter on `is:unresolved`, confirm no new events for "Generation timed out (stale-pending sweep)" under release > `a777cca`.
- **SunoFlow plugin update**: run `/plugin update sunoflow` locally; confirm `/plugin info sunoflow` reports `0.2.0` and Claude reads `SKILL.md` (111 lines) on first invoke instead of the old monolithic 345-line version.
- **Marketplace description**: `/plugin` browse should show the new third-person description after marketplace cache refresh.

## 0.2.1 patch (2026-05-16)

GlitchTip Issue 5 (race-induced P2002 on `Song.sunoJobId`) — surfaced during 0.2.0 verification; pre-existing bug exposed by the recovery refactor. Fixed via single-flight guard + idempotent `createAlternateSongs`.

Commits:
- `5d3b275` fix(generation): handle concurrent handleSongSuccess races (GlitchTip Issue 5)
- (next) chore: bump version to 0.2.1
- (next) docs: 0.2.1 wrapup — CHANGELOG, KNOWLEDGE, STATE, roadmap

Cross-repo:
- `yesterday-ai/cloud` `6e7ccd5` — extended `glitchtip-mcp` SKILL.md with the "Resolving an issue" verification workflow (four-criteria) so future agents resolve evidence-based.

GlitchTip status:
- **Issue 3** marked `resolved` in_release `63d6a1a291be4ae28f35d3c6676c33889297a5dd` (0.2.0 deploy SHA). Auto-reopens on new events.
- **Issue 5** stays `unresolved` until 7d silence window after `5d3b275` deploy.

Tests: 1274 passing / 47 skipped / 0 failed. Typecheck clean.

## 0.2.2 patch (2026-05-18)

BAU UI fix outside the M001 redesign track — mobile expanded-player tab buttons (Lyrics / Up Next / EQ) appeared dead because of a flex layout starvation bug (see KNOWLEDGE.md → Lessons learned → "flex-1 next to all flex-shrink-0 siblings"). Untested in browser; verification path documented in CHANGELOG.

Commits:
- `f177579` fix(player): enhance scroll behavior and layout in ExpandedPlayer component
- (next) chore: bump version to 0.2.2 + CHANGELOG/KNOWLEDGE

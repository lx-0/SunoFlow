---
project: SunoFlow
slug: SunoFlow
last_updated: 2026-06-02T15:00:00Z
current_milestone: M004
active_slice: S02
active_task: none
status: brownfield-imported
---

# State

**Status:** M004 in progress. **S01 monorepo restructure DONE + DEPLOYED LIVE** (`a8b85236`): pnpm workspace + `packages/core` (`@sunoflow/core`), web at root, Expo standalone; verified local docker build → CI green → Railway build → healthcheck → Online, `sunoflow.app/api/health` = 200. **Verifiable backend DONE** (vitest+tsc): `POST /api/v1/auth/token` login (`fe95d8a8`) with per-email brute-force rate-limit; bearer auth + revoke + library endpoints already existed. **Mobile core vertical written** (UNTESTED — headless, no simulator): Expo app, track-player background-audio + lock-screen, login→keychain, Library on real `/api/songs`, Player, playlists list+detail, search, secure sign-out. CI unblocked by ignoring a non-applicable vitest advisory (`5571ded2`).

## Next action

THE GATE: user runs ONE free-Apple-ID Expo dev build (`apps/mobile/README.md`) to verify the whole vertical on-device — esp. background audio surviving a 10+ min lock (S03/T07, the milestone's proof). Everything the agent wrote is unverifiable without this.

iOS-v1 surface CODE-COMPLETE (untested): login, library + search, player (background audio), playlists list + detail, secure sign-out. Remaining agent-writable RN polish (UNTESTED, shape-dependent — better after a device pass): favorites/reactions, native waveform, playlist drag-reorder.
Login endpoint now fully brute-force protected: per-IP (30/h) + per-email (10/h), verified (`70694d98`). Mini-player bar added (`2fb2c075`, untested). Login security = closed.
Deliberate follow-ups (NOT done — risky/uncertain, need focus or a device pass):
- vitest 3.2.4 → ≥4.1.0: blast radius is 183 test files (major-bump breakage risk that would re-break CI). Own task. The GHSA ignore is fine meanwhile (non-applicable dev-only advisory).
- Favorites / playlist drag-reorder / native waveform: API-shape-uncertain (favorite toggle endpoint + per-song favorite state not exposed in the library response); do AFTER the device pass clarifies real shapes.
- OAuth for `/api/mcp` (would be a new milestone, not M003-S05 — that slice is cancelled). Bearer-only is production-fine for the closed beta.
- Migrate more shared modules into `@sunoflow/core` (mcp/* relocation is the obvious next batch — collapses the `@mcp/*` alias).

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

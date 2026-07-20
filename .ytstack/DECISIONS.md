# Decisions

Append-only architectural and product decisions for SunoFlow. Never rewrite past entries. If a decision is reversed, add a new entry that supersedes.

Format for each entry:

## YYYY-MM-DD: <Short title>

**Context:** <what forced the decision>
**Options considered:** <A, B, C>
**Chose:** <selected option>
**Reason:** <why>
**Supersedes:** <link to earlier entry if this reverses a prior decision>

---

## 2026-05-15: ytstack initialised on existing codebase (brownfield import)

**Context:** SunoFlow has been in production since spring 2026. No `.ytstack/` existed. User asked for full ytstack adoption to get the lifecycle artifacts on a mature codebase.
**Options considered:**
A) Pretend it's greenfield — run `ytstack:office-hours` against the existing app.
B) Skip ytstack — feature map only as a single `docs/FEATURES.md`.
C) Brownfield import — scaffold `.ytstack/` with artifacts backfilled from README/docs/package.json, skip pitch.
**Chose:** C
**Reason:** Pitch validation on an already-shipped product is theater. A) wastes a session and produces a fabricated pitch. B) loses the lifecycle benefits (DECISIONS/KNOWLEDGE/STATE for future agents). C) preserves real context AND surfaces friction worth upstreaming to ytstack itself.

## 2026-05-15: KNOWLEDGE.md and feature inventory live in `docs/`, not duplicated here

**Context:** Repo already has `docs/feature-inventory.md`, `docs/deployment-runbook.md`, `docs/backup-runbook.md`, `docs/incident-response.md`, etc. ytstack expects KNOWLEDGE.md/RUNTIME.md to be the primary source.
**Options considered:**
A) Copy/duplicate the docs into `.ytstack/` artifacts.
B) Leave `.ytstack/` files mostly empty, link out to `docs/`.
**Chose:** B
**Reason:** Single source of truth. Duplication rots. Future ytstack skills that read KNOWLEDGE.md will see the pointer and follow it.

## 2026-05-15: GitHub-issue triage routine on Paperclip SUNAA

**Context:** SunoFlow has open GitHub issues but no recurring triage workflow on the Paperclip company SUNAA. Issues sit silently until someone manually pokes the board.
**Options considered:**
A) PM agent owns triage + delegation (single routine).
B) Engineer agent handles everything (single routine).
C) Two routines (PM triage + Engineer execution).
**Chose:** A
**Reason:** PM has GITHUB_TOKEN wired, can label/comment/close on GitHub and create SUNAA sub-issues assigned to Engineer in one heartbeat. Two routines double the cron load with no clarity gain. Scheduled MWF 10:00 Amsterdam (matches existing PM routines).
**Reference:** Paperclip routine `868b6885-5995-466c-b5ec-8adcc083ce06` ([memory](~/.claude/projects/-Users-alex-Sync-home-alex-Code-WebDev-projects-lx-0-SunoFlow/memory/project_sunoflow_paperclip_company.md))

## 2026-05-15: Active-user signal sourced from `Activity ∪ PlayHistory`, not `User.lastLoginAt`

**Context:** Single-user audit (alex) revealed that `lastLoginAt` was 20 days stale despite continuous activity. NextAuth `session.strategy="jwt"` only writes `lastLoginAt` on a fresh sign-in (Credentials `authorize()` or OAuth-first-use branch of the `jwt` callback). With the default 30d JWT TTL, `activeUsers7d/30d` admin metrics, the analytics dashboard daily-active series, the hourly snapshot job, and the weekly email-digest targeting all systematically undercount reality.
**Options considered:**
A) Throttled `lastLoginAt` write in the `jwt` callback on every authenticated request (rewrites semantics, every API call potentially does a DB write).
B) New `lastSeenAt` field updated by JWT throttle (cleanest separation, requires migration + backfill).
C) Switch metric/targeting queries to a UNION over `Activity.createdAt` and `PlayHistory.playedAt` (no schema change, no extra writes).
**Chose:** C
**Reason:** No migration, no per-request write, and the union covers the real "did anything" surface (create/favorite/playlist via Activity + listening via PlayHistory). `lastLoginAt` retains its honest "last sign-in" semantic for display in admin/profile UI. Helper at `src/lib/active-users/index.ts` (`countActiveUsers`, `listActiveUserIds`, `dailyActiveUserCounts`). Five sites switched: `admin/metrics`, `admin/stats`, `analytics-data/admin-dashboard`, `jobs/index` (hourly snapshot), `jobs/email-digest`. Tested in `index.test.ts`.
**Reference:** Commits `ab1fa19`, `d31671c`, `23116cc`. Audit conversation: see `.ytstack/STATE.md` for the broader 4-bug cluster discovered in the same session (streak-trigger gap, failed-song archival, RateLimitEntry cleanup).

## 2026-05-18: FEATURE-MAP §2 als Source-of-Truth fuer Heimat-Zuweisungen (M001-S02-T04 D1)

**Context:** Waehrend M001-S02-T03 Feature-Cross-Check zeigte sich: `docs/feature-inventory.md` (last-updated 2026-04-22) ist **19% gedriftet** -- 23 von 119 Eintraegen falsch/veraltet (Lib-Files migriert, 4 dead components, 5 falsche Pfade). FEATURE-MAP.md §2 (Code-read 2026-05-15) ist aktueller. M001-S02-T04 IA-Konsolidierung muss eine Source-of-Truth festlegen, damit nicht zwei Karten gegeneinander argumentiert wird.
**Options considered:**
A) `docs/feature-inventory.md` -- gewohnt, aber 19% drifted.
B) `FEATURE-MAP.md §2` -- code-read, aktueller, aber lebt in `.ytstack/`.
C) Cross-Reference beider, Konflikte case-by-case -- maximale Flexibilitaet, maximaler Maintenance-Aufwand.
**Chose:** B
**Reason:** Drift macht A unzuverlaessig fuer IA-Decisions (Lib-File-Pfade falsch, dead components als "Built" markiert). B ist code-anchored und wurde aus dem laufenden Repo geschrieben. C waere Bias-Hotbed. Folgende Tasks (T04 IA-Map, S03 Generate-Redesign, M002+ Migration) ziehen Heimat-Zuweisungen aus FEATURE-MAP §2. Inventory-Refresh ist Folge-TODO fuer post-M001 (BAU auf Paperclip SUNAA).
**Reference:** `.ytstack/M001-FEATURE-GAPS.md`, `.ytstack/USER-JOURNEY.md` §9.5.

## 2026-05-18: /inspire bleibt eigene Page (Primary §3 Generate) (M001-S02-T04 D2)

**Context:** `/inspire` ist dual-citizen Generate (Prompt-Seeds feed `GenerateForm`) + Discover (Browse-feed). USER-JOURNEY §9.5 #1 Multi-Home-Decision.
**Options considered:**
A) Primary §3 Generate, secondary §7 Discover (Link aus beiden).
B) Primary §7 Discover, link aus §3.
C) Verschmelzen in `/generate?tab=inspire`.
**Chose:** A
**Reason:** Der Loop "see prompts → generate song" fuehrt zurueck zu Generate. `/inspire` UX ist Card-Grid + scroll, eigene Page sinnvoll. Link in `/discover?tab=inspire` als Secondary-Entry-Point (M002+).
**Reference:** USER-JOURNEY.md §9.5 #1.

## 2026-05-18: /compare → /generate?tab=compare (M001-S02-T04 D3)

**Context:** `/compare` ist A/B-Compare zweier Generations-Outputs. USER-JOURNEY §9.5 #2.
**Options considered:**
A) Eigene Top-Level-Route bleibt.
B) Sub-Tab in `/generate`.
C) Sub-Tool in `/library/[id]` Refine.
**Chose:** B
**Reason:** Compare ist Generate-Subflow (zwei Generationen vergleichen, dann eventuell remixen/wiederholen). Tab in `/generate` macht's discoverable. SongCompareView Component aendert Heimat von Discover-adjacent → Generate.
**Reference:** USER-JOURNEY.md §9.5 #2.

## 2026-05-18: /discover + /explore + /radio + /feed merge zu /discover mit Tabs (M001-S02-T04 D4-D5)

**Context:** Heute 4 separate Top-Nav-Items (`/discover`, `/explore`, `/radio`, `/feed`) -- 24% der 17 Mobile-Drawer-Slots fuer Sekundaer-Loop. `/discover` und `/explore` teilen sogar denselben Component `DiscoverView` mit verschiedenen Filter-Args.
**Options considered:**
A) Status quo -- 4 separate Routes.
B) Merge zu `/discover` mit 4 Tabs (Top/Explore/Radio/Feed).
C) Behalte `/radio` und `/feed` separat, merge nur `/discover`+`/explore`.
**Chose:** B
**Reason:** Alle 4 sind Discover-Sub-Modi mit Card-Grid-UX. DiscoverView-Wiederverwendung ist Hinweis dass Trennung nie semantisch war. Tab-Component statt 4 Routes spart 3 Nav-Slots auf Mobile + 3 Page-Files. radioState lebt in QueueContext -- Cross-Cut zu §4 Listen bleibt unveraendert (sub-tab kann Player in Radio-Mode versetzen).
**Reference:** USER-JOURNEY.md §9.5 #3, #4. M001-IA-MAP.md §4.1.

## 2026-05-18: /songs → kill, merge in /library als view-mode (M001-S02-T04 D6)

**Context:** Heute zwei Library-Surfaces (`/library` mit `LibraryView`, `/songs` mit `SongsGalleryView`) ohne klare Trennung. USER-JOURNEY §9.5 #5.
**Options considered:**
A) `/songs` und `/library` bleiben mit klar definiertem Unterschied (Marketing-Doku noetig).
B) `/songs` → `/library?viewMode=gallery` (Filter-Variant).
C) `/songs` killen, `SongsGalleryView` wird `LibraryView`-Render-Mode.
**Chose:** C
**Reason:** B addiert noch einen URL-Param zur ohnehin 12-axis-Filter LibraryView. C konsolidiert auf Component-Layer (SongsGalleryView wird Render-Strategie in LibraryView, viewMode-Param wechselt Layout). Migrations-Schritt: 301-Redirect `/songs` → `/library` mit `viewMode=gallery`.
**Reference:** USER-JOURNEY.md §9.5 #5.

## 2026-05-18: /discover/collections/[id] → /library/collections/[id] (URL-Fix) (M001-S02-T04 D7)

**Context:** Collections sind Library-Domain (FEATURE-MAP §2 #4 Library), aber URL liegt unter `/discover` -- USER-JOURNEY §9.5 #6.
**Options considered:**
A) URL bleibt unter `/discover`.
B) URL-Fix nach `/library/collections/[id]`.
**Chose:** B
**Reason:** Domain-Mapping muss URL widerspiegeln. CollectionDetailView Component-Heimat wandert von discover-context → library-context. 301-Redirect noetig.
**Reference:** USER-JOURNEY.md §9.5 #6, FEATURE-GAPS §D.

## 2026-05-18: /users/[id] → /profile/[id], /u/[username] bleibt public-permalink (M001-S02-T04 D8)

**Context:** Zwei Profile-Surfaces -- `/users/[id]` (in-app, session-gated) und `/u/[username]` (public-permalink). Naming-Drift. USER-JOURNEY §9.5 #7.
**Options considered:**
A) Beide bleiben mit klar getrennten Zwecken.
B) `/users/[id]` umbenennen in `/profile/[id]` fuer Klarheit, `/u/[username]` bleibt public.
C) Merge zu einer Route mit Auth-Check-Branch.
**Chose:** B
**Reason:** Public-Permalink (`/u/[username]`) hat externe Konsumenten (geteilte URLs) -- darf nicht aendern. In-App-Surface umbenennen schafft Klarheit; `/users` impliziert User-Listing (kollidiert mit `/admin/users`). 301-Redirect von `/users/[id]` → `/profile/[id]`.
**Reference:** USER-JOURNEY.md §9.5 #7.

## 2026-05-18: Analytics-5-Cluster → /analytics mit Sub-Tabs + /admin/analytics (M001-S02-T04 D9)

**Context:** 5 Analytics-Surfaces heute (`/analytics`, `/stats`, `/insights`, `/dashboard/analytics`, `/admin/analytics`) fuer ein Konzept "see my data". USER-JOURNEY §9.5 #8.
**Options considered:**
A) Status quo.
B) Collapse user-facing 4 in `/analytics` mit Tabs (Overview/Stats/Insights/Songs); `/admin/analytics` bleibt separat.
C) Komplett kollabieren auf 1 Route mit Admin-Auth-Check.
**Chose:** B
**Reason:** 5 Routes fuer eine Domain ist Drift. 5 Chart-Files (`analytics/{Admin,Insights,Play,Stats,User}AnalyticsCharts`) mirroren 1:1 die Routes -- Konsolidierung auf Code-Layer ist parallel moeglich. Admin bleibt separat (Sub-App-Constraint).
**Reference:** USER-JOURNEY.md §9.5 #8. M001-IA-MAP.md §4.2.

## 2026-05-18: Generate-5-Cluster → /generate Tabs + /generations Sub-View + /inspire separat (M001-S02-T04 D10)

**Context:** 5 Generate-Surfaces (`/generate`, `/generations`, `/mashup`, `/compare`, `/inspire`). USER-JOURNEY §9.5 #9.
**Options considered:**
A) Status quo.
B) `/generate` mit Tabs (Simple/Advanced/Mashup/Compare); `/generations` als Sub-View; `/inspire` bleibt separat (D2).
C) Alle 5 in eine Tab-Hub.
**Chose:** B
**Reason:** Mashup + Compare sind Generate-Mode-Varianten -- Tabs sinnvoll. Generations-History ist eng gekoppelt -- Sub-View. Inspire ist dual-citizen Discover, bleibt eigene Page (D2). FRICTION-AUDIT §1: GenerateForm hat 30 useState; Tabs sind Disclosure-Pattern statt mehr State im selben Modul.
**Reference:** USER-JOURNEY.md §9.5 #9. M001-IA-MAP.md §4.3.

## 2026-05-18: Authoring-Cluster → /authoring Hub mit Sub-Tabs (M001-S02-T04 D11)

**Context:** 3 Top-Level-Routen (`/personas`, `/templates`, `/style-templates`) fuer FEATURE-MAP §6 "Authoring helpers". USER-JOURNEY §9.5 #10.
**Options considered:**
A) Status quo (3 separate Routes).
B) `/authoring` Hub mit 3 Sub-Tabs.
C) Eingebettet in `/settings`.
**Chose:** B
**Reason:** Alle drei gleicher Bounded Context, gleicher CRUD-Pattern (3 parallele Manager-Components). User craftet Prompt-Toolkit als zusammenhaengenden Workflow. Default-Tab = Personas (most-used). C waere falsche Heimat -- Authoring ist creative-tooling, nicht Account-Setting.
**Reference:** USER-JOURNEY.md §9.5 #10. M001-IA-MAP.md §4.4.

## 2026-05-18: Persona-Auswahl bleibt inline in GenerateForm (M001-S02-T04 D12)

**Context:** Mit `/authoring` Hub (D11) koennten Persona-Auswahl + Persona-Management auf gleiche Page wandern. USER-JOURNEY §9.5 #11.
**Options considered:**
A) Auswahl + Management beides in `/authoring`.
B) Auswahl in `/generate` (inline), Management in `/authoring`.
**Chose:** B
**Reason:** Trennung von Use vs Manage ist sauberes UX-Pattern (siehe Photoshop: Brush-Picker inline, Brush-Settings im Dialog). Inline-Picker im GenerateForm ist Persona als Generate-Schritt; `/authoring` ist Persona als Tool.
**Reference:** USER-JOURNEY.md §9.5 #11.

## 2026-05-18: /library/[id] Primary=§6 Refine, Cross-Cuts akzeptiert (M001-S02-T04 D13)

**Context:** `/library/[id]` ist Multi-Home: Page-Logik = §6 Refine (SongDetailView Switchboard), aber URL liegt unter /library (§5 Organize), und Component startet Listen-Loop via in-page Waveform. USER-JOURNEY §9.5 #12.
**Options considered:**
A) URL aendern auf `/refine/[id]` zu klaren Heimat-Markierung.
B) URL bleibt `/library/[id]`, Page-Heimat = §6 in Documentation, Cross-Cuts akzeptiert.
**Chose:** B
**Reason:** A bricht externe Bookmarks. B konzeptuelle Klarheit ohne URL-Aenderung. Page-Document-Heimat = §6, aber Multi-Home als Realitaet anerkennen. SongDetailView ist switchboard-by-design.
**Reference:** USER-JOURNEY.md §9.5 #12.

## 2026-05-18: Mobile-Nav bleibt einheitlicher Drawer (nicht Bottom-Nav) (M001-S02-T04 D14)

**Context:** Mit 17 → 8 Nav-Items waere Bottom-Nav (5 Items, mobile-Standard) eine Option. USER-JOURNEY §1 + MOBILE-AUDIT §B.4.
**Options considered:**
A) Bottom-Nav mit 5 Items + Hamburger fuer Rest.
B) Einheitlicher Drawer mit 8 Items (heute schon Code-Layer in AppShell).
C) Hybrid: 3 Bottom + Drawer-Rest.
**Chose:** B
**Reason:** Bottom-Nav ist Architektur-Aenderung im AppShell (61 commits Hot-File) + Konflikt mit GlobalPlayer-Slot (auch bottom). Drawer ist heute-Implementierung, 17→8 Items macht's per se besser. M004+ kann Bottom-Nav nach Feedback noch evaluieren. Risk-vs-Benefit: niedriges Risiko bei B, gut-genug Mobile-UX.
**Reference:** USER-JOURNEY.md §1 (Persona Mobile-Power-User), M001-MOBILE-AUDIT.md §B.4, M001-IA-MAP.md §5.

## 2026-05-18: Audio-Proxy serves byte ranges from streams, not buffered reads

**Context:** `proxyAudio.serveCached` used `audioCache.get` → `readFileSync` on every request, reading the full 3–7 MB mp3 into memory and blocking the Node event loop. Symptom: iOS PWA playback stalled / hung after a brief play, even with the file already on disk and the SW out of the way. Multi-MB sync reads serialised every concurrent request.
**Options considered:**
A) Make `FileCache.get` async (`fs.promises.readFile`) and ripple `await` through every caller.
B) Add a new `FileCache.getStream(id, start?, end?)` returning a Web `ReadableStream` (Node `createReadStream` → `Readable.toWeb` equivalent), keep sync `get` for cold paths.
C) Move audio bytes off the volume and serve from a Cloudflare R2 / external CDN.
**Chose:** B
**Reason:** Hot path (audio Range requests) gets the only correct shape — non-blocking *and* serves only the requested byte slice (no 5 MB read for a 500 KB range). Cold callers (warmup, admin tools) keep sync `get` to avoid a big-bang async refactor. Option C is right long-term but a much larger move; B is a one-file change with zero migration cost.
**Reference:** `src/lib/cache/file.ts` (`getStream`, `nodeStreamToWeb`), `src/lib/audio/index.ts` (`serveCached`), `src/lib/cache/file.test.ts`. KNOWLEDGE.md "Lessons learned" — sync-readFileSync. Commit `f3423bc` / `0.2.2`.

## 2026-05-18: Service Worker bypasses itself for `/api/audio/*` Range requests

**Context:** The original SW strategy was URL-keyed cache-first for `/api/audio/*` (intended to enable Save-Offline + warm subsequent plays). With Range requests this was unsafe: `cache.match(request)` ignores the Range header by default, so the first cached partial would be served for every subsequent byte-range — songs played the first chunk and then stalled. Per spec, `cache.put` rejects 206 responses with TypeError; WebKit's iOS PWA implementation is inconsistent enough that we cannot rely on the rejection.
**Options considered:**
A) Always cache, slice client-side on subsequent requests (custom Range handler inside the SW).
B) Bypass the SW entirely when the request carries a Range header; only cache full 200 responses (Save-Offline writes via a separate code path).
C) Drop the SW audio cache entirely; rely on the server-side file cache + HTTP cache headers.
**Chose:** B
**Reason:** A is correct but a meaningful re-implementation of Range semantics in JS, and would still be fragile against WebKit quirks. B retains the Save-Offline feature (explicit fetch with no Range → 200 OK → cached) while removing the breakage source. C loses Save-Offline. B also forced an `AUDIO_CACHE` version bump (`v1` → `v2`) to evict any 206 partials WebKit may have stored despite the spec.
**Reference:** `public/sw.js` (`isProxiedAudioRequest` branch + `AUDIO_CACHE` constant). KNOWLEDGE.md "Lessons learned" — SW cache.match ignores Range. Commit `f3423bc` / `0.2.2`.

## 2026-05-18: Middleware `PUBLIC_PATHS` covers media-proxy routes; auth still enforced in handlers

**Context:** Media-proxy routes (`/api/audio/`, `/api/audio/public/`, `/api/images/`) were not in `PUBLIC_PATHS`. The middleware redirected unauthenticated requests with `307 → /login`; the `<audio>` / `<img>` element followed the redirect and tried to play the login HTML as the media stream → silent breakage on share pages, embeds, and iOS PWAs that lost their JWT cookie.
**Options considered:**
A) Add the media-proxy paths to `PUBLIC_PATHS` and rely on the route handlers' existing `authRoute` / `publicRoute` checks.
B) Keep middleware enforcement and have the handlers return a media-friendly 401 (e.g. a 1-byte silent mp3) for unauth.
C) Generate signed URLs for media so middleware can validate without a cookie.
**Chose:** A
**Reason:** A is the smallest correct change. The route handlers were already enforcing auth correctly — the middleware was just hiding the proper 401 response behind a 307-HTML redirect. Authenticated routes now return `401 application/json` (verified live in prod) which the audio element treats as a clean error → triggers our retry / fallback. B is hacky and doesn't help the share-page case. C is overkill for the current threat model (no rate-limit or cost-driven need to gate at the edge).
**Reference:** `src/middleware.ts` (`PUBLIC_PATHS`). KNOWLEDGE.md "Lessons learned" — media-proxy in PUBLIC_PATHS. Commit `f3423bc` / `0.2.2`.


## 2026-05-18: D15 -- Naming-Drift Resolution (Pre-M002) (M001-S03-T03 D15)

**Context:** M001-GENERATE-INVENTORY §1.1 hat Naming-Drift zwischen Form und API dokumentiert: Form `stylePrompt` vs API `tags` vs Helper `style` (3 Namen, ein Konzept); Form `lyrics` vs API `prompt` (semantischer Mismatch, "prompt" ist API-Lingo aber im Form heisst es "Lyrics"). M002 Generate-Refactor wird beide Felder anfassen. Eine Decision muss VOR Refactor stehen, sonst manifestieren die Drifts in den neuen Sub-Components weiter.

**Options considered:**
A) Form-vocab gewinnt: `stylePrompt` + `lyrics` ueberall. API umbenennen via Zod-key-rename + Migration der API-Konsumenten.
B) API-vocab gewinnt: `tags` + `prompt` ueberall. Form-State-Variablen umbenennen. UI-Label "Lyrics" bleibt -- nur Code-internal `prompt`.
C) Drift akzeptieren mit Code-Comment: "form uses A, API uses B".

**Chose:** **B** (with caveat).

**Reason:** API-Schema ist Source-of-Truth fuer Generate-Domain (per FEATURE-MAP §3 "load-bearing flow"). External-API-Konsumenten via `/api/v1/*` koennen Form-Namen nicht sehen -- aber Code-Maintainer der GenerateForm anfasst muss zwischen Form-Vocab und API-Vocab uebersetzen. **B macht den Code-Pfad konsistent: API → Code internal → Form state. Nur UI-Label bleibt user-friendly ("Lyrics" statt "Prompt").** A wuerde API-Konsumenten brechen; C ist Drift die wieder kostet. Konkret in M002: `stylePrompt`-useState wird `style`-useState (matched `lib/generation/params.ts` constants). `lyrics`-useState wird `prompt`-useState. UI-Label bleibt "Lyrics" (mehr UX-friendly als "Prompt" fuer den Songtext-Input).

**Reference:** `.ytstack/M001-GENERATE-INVENTORY.md` §1.1, `.ytstack/M001-GENERATE-REDESIGN.md` §7.3. M002-Pre-Refactor.

## 2026-05-18: D16 -- Folge-Milestones Sequence Order (M001-S03-T03 D16)

**Context:** M001 hat 13 IA-Decisions (D2-D14) produziert die in M002+ implementiert werden. Sequenz-Order ist nicht beliebig -- Dependencies (god-object-Touches, Bookmark-Risks, Lerneffekt) bestimmen Reihenfolge.

**Options considered:**
A) Alle 13 Decisions in einem grossen M002 implementieren -- maximal parallel, maximales Risiko.
B) Decision-by-decision, eine M### pro Decision -- minimal parallel, sehr granulare Milestones (13+ Milestones).
C) Geclustert nach Dependency + Risk: M002 Generate-Refactor (god-object-First), M003+M004 IA-Konsolidierung Phase 1+2, M005 Cleanup, M006+M007 als GO/NO-GO Engineering-Passes.

**Chose:** **C**

**Reason:** A hat zu viel Hot-File-Konflikt-Risiko (4 god-objects gleichzeitig touchen). B fragmentiert die Decisions zu sehr -- z.B. D4-D5 Discover-Cluster sind eine Architektur-Einheit, in 4 Milestones zu splitten ist Theater. C cluster nach 3 Kriterien: (1) was hat fertigen Plan (M002 first), (2) was hat shared Files (M003 alle AppShell-Touches), (3) was ist Risk-vs-Benefit-Decision (M006+M007 GO/NO-GO). Detail in `.ytstack/M001-FOLLOWUP-ROADMAP.md`.

**Reference:** `.ytstack/M001-FOLLOWUP-ROADMAP.md` "Sequence Rationale" section.


## 2026-05-18: D17 -- Migration-Strategy: Feature-Flags + permanent 301-Redirects (M001-S03-T04 D17)

**Context:** M001 hat 13 Decisions (D2-D14) plus D15+D16 produziert. Implementation in M002-M004 ueber 7-10 Wochen sequenziell. Migration-Strategie muss vor M002-Start formal sein -- sonst werden Rollback-Pfade ad-hoc improvisiert.

**Options considered:**
A) Hard-Cutover (no flags) -- schnell, hohe Risk-Klasse, Rollback teuer.
B) Feature-Flags fuer alle Refactors + permanent 301-Redirects fuer alle URL-Aenderungen.
C) Feature-Flags nur fuer Hot-File-Touches (M002, M006) + 301-Redirects + Hard-Cutover fuer Low-Risk-Aenderungen.

**Chose:** **B** (with carve-out for M005-M007).

**Reason:** Konkret: M002 (Generate-Refactor, Hot-File 44 commits, god-object) braucht zwingend Feature-Flag mit 5%→50%→100% rollout. M003 (frontend tab-hub) profitiert von Flag fuer 1-Wochen-Soak. M004 (URL-renamings) wird per 301-Redirect migriert, neue /authoring Hub bekommt eigenes Flag. M005 (delete-only), M006/M007 (engineering-pass, behavior-equivalent) brauchen KEIN Flag -- gehen durch Test-Coverage + Verification-PR-Checklist. **301-Redirects sind permanent** (LOW maintenance cost, schuetzt Bookmarks + Shortcuts + Embed-URLs). Details in `.ytstack/M001-MIGRATION-STRATEGY.md`.

**Reference:** `.ytstack/M001-MIGRATION-STRATEGY.md`, IA-MAP §8.


## 2026-05-21: Production custom domain — `sunoflow.app` apex-primary on Railway via INWX

**Context:** Acquired `sunoflow.app` (registrar INWX). Needed to point it at the Railway-hosted production service (previously only reachable at `sunoflow.up.railway.app`). User wants the bare apex (`sunoflow.app`) as the canonical URL — explicitly *not* `www`, and explicitly no provider switch away from INWX.

**Options considered:**
A) Use `www.sunoflow.app` as primary + 301 the apex to www (works with a plain CNAME — apex CNAME is forbidden by RFC 1034).
B) Move nameservers to Cloudflare for CNAME-flattening so the apex CNAME Railway asks for works directly.
C) Stay on INWX, serve the apex directly via an INWX **ALIAS** record (INWX supports ALIAS, which is legal at the zone apex), `www` via a normal CNAME.

**Chose:** **C**

**Reason:** User rejected both a www-redirect (A — "www is ugly", apex must be the real URL) and a provider switch (B — no Cloudflare). INWX natively supports ALIAS records, which solve apex-CNAME directly without leaving INWX. Final DNS at INWX: `ALIAS @ → <railway-apex-target>`, `CNAME www → <railway-www-target>`, plus two ownership-verify TXTs (`_railway-verify` for apex, `_railway-verify.www` for www — Railway issues a distinct target + verify per domain). `AUTH_URL` set to `https://sunoflow.app` (canonical for NextAuth callbacks/cookies; www login may cookie-mismatch, acceptable since apex is primary). **Critical gotcha:** the Railway custom-domain target port must be **8080**, not the Dockerfile's `EXPOSE/ENV PORT 3000` — see KNOWLEDGE.md → "Railway custom-domain target port is 8080, not the Dockerfile port".

**Reference:** KNOWLEDGE.md → Gotchas; memory `reference_railway_runtime_port_8080.md`.

## 2026-05-21: RSS feed enrichment — follow article links on truncation signal, not on inline length

**Context:** The Inspire feature feeds RSS items to the song generator. For tagesschau-style German news feeds, items arrived with a literal `[ mehr ]` artifact and only a ~200-char summary instead of the article body. Root cause: `<content:encoded>` (preferred over `<description>`) is, for these feeds, `image + the same summary + a "[<a>mehr</a>]" read-more link` — not the article. The earlier link-following fix (SUNAA-542) gated backfill on `inlineLength < 200`, which the dressed-up summary cleared, so the link was never followed and the marker leaked into the generator prompt. Recurring complaint across multiple tickets.

**Options considered:**
A) Lazy enrichment — fetch the full article only at "Generate from this" click, for the one selected item. Cheap (1 fetch), but cards/digest/auto-generate still show summaries.
B) Eager enrichment — follow links for all displayed feed items at fetch time. Heavier (up to 20 fetches/feed), but every consumer (Inspire cards, Today's Picks, auto-generate) gets full text.
C) Both — eager with higher cap plus lazy fallback at click.

**Chose:** **B**, with a truncation-driven trigger and hard resource bounds.

**Reason:** User wants full article text everywhere it's consumed, not just at click. The decisive design rule: **inline content length is not a proxy for "is this the full article"** — a marker-bearing summary can exceed any length threshold. Enrichment now triggers on `RssItem.truncated` (a read-more marker / trailing-ellipsis detected during parse) **OR** `inlineLength < threshold`, never length alone. Markers are stripped at the parse layer (`hasReadMoreMarker` / `stripReadMoreMarker`) so even un-enrichable items (e.g. tagesschau `/video/*` pages with no `<article>` body) fall back to a clean, marker-free summary. Eager-all is made safe by per-feed concurrency cap (6) and a hard 9 s enrichment time budget raced against the batch loop, so the feed response never hangs — slow articles simply keep their summary. Fix sits at the `fetchFeed` seam so all consumers benefit.

**Reference:** `src/lib/rss/{parse,index,types}.ts`; commit `b040ee6` / `0.2.3`; KNOWLEDGE.md → Gotchas ("German news RSS `<content:encoded>` is NOT the article body").

## 2026-05-21: Registration is invite-only (closed beta) via single-use codes

**Context:** The landing page presented SunoFlow as a launched public product (fabricated social-proof stats — "Trusted by creators worldwide", `Math.max(users, 2500)` flooring ~2 real users to "2,500+" — and open self-serve signup) while the app is heavy WIP with a handful of users. User wanted the marketing fiction removed AND registration restricted to selected people.

**Options considered:**
A) Close registration entirely — no self-serve, operator creates accounts manually. Zero schema, but no delegation.
B) Email allowlist — only listed addresses may register. Lightweight, reuses the admin-email pattern, but no per-person tracking.
C) Single-use invite codes — `InviteCode` table, code required at `/register`, operator generates + hands out codes.
D) Full waitlist — landing captures emails, operator approves → invite mail. Largest build.

**Chose:** **C** (single-use codes), with admin-email bypass; **Google-OAuth gate deferred**.

**Reason:** User picked invite codes for per-person control without the waitlist build. Design points: (1) `InviteCode` model is single-use (`usedByUserId @unique`, nullable `expiresAt`), claimed atomically via a guarded `updateMany` with user-rollback on a lost race. (2) `isAdminEmail()` (the `ADMIN_EMAILS` env identity) **bypasses** the gate so the operator can always bootstrap. (3) The PrismaAdapter would auto-create a user on first Google login, bypassing the code — but user confirmed `AUTH_GOOGLE_ID/SECRET` are unset in prod (provider inactive), so we did **not** add a `signIn` callback to block new OAuth users. If Google is ever enabled, that gate becomes required (block sign-in when no existing user matches the email). (4) Codes are generated/listed/copied via a new admin UI (`/admin/invite-codes` + `GET/POST /api/admin/invite-codes`). Separately, the landing page was reframed from launch-marketing to an honest "private beta · invite-only · WIP" voice (badge, CTAs "Have an invite? Sign up" / "Request access" mailto, beta-banner copy dropping the false "no limits" claim).

**Reference:** `src/lib/auth/{invite,register}.ts`, `src/app/api/admin/invite-codes/route.ts`, `src/app/[locale]/admin/invite-codes/page.tsx`, `src/components/LandingPage.tsx`; migration `20260521120000_add_invite_code`; commits `7e155c9` (gate) + landing reframe; KNOWLEDGE.md → Gotchas ("registration gate must bypass under `PLAYWRIGHT_TEST`").

## 2026-05-28: Remote MCP server hosted at `/api/mcp` — Streamable HTTP, not stdio refactor (M003)

**Context:** The SunoFlow plugin shipped only the skill; users had to clone the repo, set `DATABASE_URL`, and spawn `tsx mcp/server.ts` to use the MCP server. Goal: `/plugin install sunoflow` + `SUNOFLOW_API_KEY` should yield a working server with nothing else. The stdio server is deeply coupled to Prisma + `src/lib/*` (every tool calls `@/lib/sunoapi`, `@/lib/credits`, etc.), so shipping it standalone meant either bundling the whole app with DB credentials or refactoring all 15 tools to HTTP clients.

**Options considered:**
A) Stdio + HTTP-client refactor — 15 tools rewritten to fetch the SunoFlow REST API; ship as npm package or via plugin. Multi-day, requires complete HTTP coverage for every tool feature.
B) Bundle stdio + Prisma client in plugin — ships the DB connection string burden to the user; impossible for hosted users.
C) **Remote MCP at `/api/mcp` (Streamable HTTP) hosted by SunoFlow itself.** Plugin ships only `.mcp.json` pointing at the URL with env-var interpolation.

**Chose:** **C**.

**Reason:** The MCP spec 2025-06-18 makes Streamable HTTP the recommended transport for remote servers (HTTP+SSE deprecated; stdio reserved for local-only tooling). Hosting the server inside the Next.js app means the existing Prisma + `src/lib/*` coupling becomes a feature (server-side code), not a problem to engineer around. Tools, registry, resources stay byte-for-byte identical; only the transport changes (`StdioServerTransport` → `WebStandardStreamableHTTPServerTransport`, single Next.js route handler). Bearer-API-key auth via `Authorization: Bearer sk-...` reuses the existing `ApiKey` table. Origin-header allowlist + per-key sliding-window rate-limit + `logServerError` GlitchTip events sit in front of the SDK dispatch.

Stdio remains as a deprecated legacy entry point (stderr banner at startup) for self-hosters with the repo cloned; planned removal in a future release.

**Reference:** `src/app/api/mcp/route.ts`, `src/lib/mcp/{http-transport,register-handlers,registry-bootstrap,origin-guard,rate-limit}.ts`, `mcp/auth.ts` (split into env+header paths), `.mcp.json`, `docs/MCP.md`; commits `c38b030` (transport), `7bb8618` (plugin/0.3.0/.mcp.json), `7149191` (@mcp/* alias), `d34a43d` (dockerignore fix); `lx-0/skills` marketplace commit `178781c`; M003-CONTEXT.md, KNOWLEDGE.md → "Streamable-HTTP MCP server in Next.js App Router" + "MCP-Server hardening".

## 2026-06-02: M003-S05 OAuth path cancelled, not deferred to a milestone slot (M003 close)

**Context:** M003's S05 was "OAuth 2.0 path (.well-known + PKCE)" as an alternative to the Bearer API key. The Bearer path landed in S01-S04 and is production-ready; the user-facing M003 goal ("install plugin + set env var → works") is fully satisfied. M004 had previously been verbally tagged as "OAuth follow-up", but when M004 was actually planned (2026-05-30+), the slot went to the Native-iOS-App initiative instead.

**Chose:** Mark S05 `cancelled`, not `deferred`. If OAuth becomes relevant later, plan a fresh milestone — do not revive a slice inside a closed milestone.

**Reason:** A done milestone with a lingering open slice is roadmap drift — future agents see contradictory state. Bearer-only auth is production-fine for the closed beta; closed-beta users (operator + invitees) all have an API key flow already. OAuth is forward-looking infrastructure (Dynamic Client Registration, PKCE, refresh-token rotation) that deserves its own scope discussion (better-auth provider plugin vs node-oauth2-server vs in-house) when the demand surfaces.

**Reference:** `.ytstack/M003-S05-PLAN.md` (status: cancelled), `.ytstack/M003-ROADMAP.md` (4 done + 1 cancelled), STATE.md "M003 closed 2026-06-02" marker.

## 2026-06-05: Brand + visual-system baseline captured as PRODUCT.md + DESIGN.md + .impeccable/design.json

**Context:** Code shipped a never-deliberate visual system (light-default `globals.css`, violet `#7c3aed` accent reused 1049 times across components, `font-family: Arial` fallback, pure white surfaces, gradient text in marketing copy). No PRODUCT.md or DESIGN.md existed. The impeccable skill produced both as agent-readable docs.

**Options considered:**
A) Scan-as-is — capture exactly what the code currently does. Honest snapshot, useless for variant generation against a defined brand.
B) Seed-greenfield — treat the project as if no visual system existed yet, write a minimal scaffold. Discards the established Geist Sans + 16/12/20px-radius vocabulary that IS deliberate.
C) **Scan + Re-Anchor** — inventory existing tokens, but write DESIGN.md so they fit the just-declared PRODUCT.md (dark-first, anti-violet, OKLCH, new accent). Flag the gap as Don'ts.

**Chose:** **C**, with Electric Magenta `oklch(62% 0.27 350)` as the new primary accent, replacing violet.

**Reason:** The user's three-word brand direction (*Playful · Vibrant · Disciplined*) plus four explicit anti-references — generic SaaS, suno.com's pop-AI execution, trendy AI lila-gradient look, consumer-music-app feeds — directly excluded the current code's palette. Re-anchoring DESIGN.md to the strategy is what the docs are for; the code matches over time via migrate-on-touch. North star "The Late-Night Studio Console" locks the dark-first decision. Geist Sans + Geist Mono retained (already loaded); Mono is reserved for user-authored content (lyrics, prompts, slugs, IDs) as a structural visual signal.

**Reference:** `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json` at project root. CHANGELOG `[Unreleased]`, roadmap `### Milestone 10` (PROPOSED).

## 2026-06-05: As-is UX captured as JOURNEYS.md via reproducible Playwright recorder

**Context:** PRODUCT.md was written without a journey audit. User pushed back: a complete UX inspection matters more than swapping colors. Needed an empirical snapshot of the live app, not source-archaeology, so the gap between strategy and code is concrete.

**Options considered:**
A) Static code-trace per mode — read AppShell + LibraryView + GenerateForm + GlobalPlayer source. Faster, sees code intent, misses real friction.
B) **Full Playwright walkthrough with screenshots against local dev** — drive the actual app, capture 30+ surfaces, record observations from rendered output.
C) Critique a single surface in depth, then decide whether to broaden.
D) Operator-dictated journeys — user describes the late-night session, agent reconstructs.

**Chose:** **B**.

**Reason:** Color-swap without UX context is symptom-level work. A real walkthrough surfaced seven priority findings that source-reading would not have: (1) `/library` hard-errors instead of rendering an empty state for fresh users; (2) Mashup is fully paywalled, contradicting the three-equal-modes claim; (3) two app shells coexist; (4) four overlapping names for one concept (Template / Preset / Style Template / Saved Style); (5) the Discovery cluster (`/discover` + `/explore` + `/feed` + `/radio` + `/inspire` + auto-generated playlists) implements the exact "Made for you" recommendation pattern PRODUCT.md bans; (6) whole-app visual migration scope; (7) twenty top-level routes vs the three-modes story. Local-dev setup required several workarounds (DATABASE_URL override away from the `projects-db` docker-network alias; `pnpm dev` wrapper bypass for pnpm-11 `confirmModulesPurge`; `HOSTNAME=0.0.0.0` for Chromium reachability in the macOS sandbox) — captured in the project memory `reference_sunoflow_local_dev_recipe.md`.

**Reference:** `JOURNEYS.md`, `/tmp/sunoflow-journey/journey.mjs` (ephemeral recorder), `/tmp/sunoflow-journey/*.png` (32 screenshots, ephemeral), CHANGELOG `[Unreleased]`, roadmap `### Milestone 10` (PROPOSED).

## 2026-06-05: UX-spec format chosen — hybrid YAML-metadata + Stitch 6-section markdown, file `UX.md`, not yet written

**Context:** Need a format for a living UX spec (separate from the dated JOURNEYS.md audit snapshot). Researched the agentic-engineering doc landscape and the local ytstack idiom.

**Options considered:**
A) GitHub Spec Kit (`spec.md` + `plan.md` + `tasks.md`) — heavyweight, engineering-flavored, opinionated CLI workflow.
B) Gherkin `.feature` files (Given-When-Then) — doubles as test source, verbose for screen-state work, under-specifies *feel*.
C) XState statecharts (TS source or Stately JSON) — exhaustive on transitions, steep entry, non-designer-reviewer hostile.
D) Addy-Osmani-style prose — lightweight, no tooling enforcement.
E) **Hybrid: ytstack-style YAML frontmatter for metadata + Stitch 6-section markdown body + Mermaid + tables as structured escape-hatches inside prose-first sections.**

**Chose:** **E**, file name `UX.md`, sibling to PRODUCT.md + DESIGN.md at the project root.

**Reason:** ytstack convention uses YAML frontmatter for queryable metadata (`name`, `slug`, `created`, `updated`, `status`), not for token data. Stitch DESIGN.md uses YAML frontmatter for tokens. SunoFlow already runs both side-by-side. The hybrid reads naturally in both contexts: frontmatter for lineage + screen/journey counts, body for prose with Mermaid statecharts and screen-state tables. Sections in fixed order: Modes / Screens / States / Journeys / Transitions / Empty-States. JOURNEYS.md remains a dated audit-snapshot type; UX.md is the living spec.

**Not yet written.** The mode-model decision (three modes per PRODUCT.md, or six per the route inventory) blocks UX.md authorship: writing it now would cement the unresolved gap.

**Reference:** Project memory `feedback_ux_spec_format_for_ytstack.md`. CHANGELOG `[Unreleased]`. Roadmap `### Milestone 10` deliverable "Write `UX.md` (living spec) after mode decision".

## 2026-06-07: Native app navigation — fixed tree, switch-not-stack, singleton player, global chrome

**Context:** After longer device use the user reported the app had no fixed navigation tree — every sidebar/bottom-nav/in-view navigation pushed a new view, so Back walked an ever-growing stack, and the Now-Playing player could open multiple times (had to be closed twice). Not native music-app UX.

**Root cause:** Every feature screen was a root-level sibling of `(tabs)`, and ~68 of ~70 navigations used `router.push`. `router.navigate` only pops when the *exact* route is already in history, so moving between fresh sections always stacked. 21 sites did `router.push("/player")` → `push` always adds a new modal.

**Options considered:**
A) Real expo-router `Tabs` with per-tab stacks — restructure ~45 screens into tab folders; the sidebar reaches everything regardless of tab, so per-tab placement is arbitrary. Heavy, risky.
B) **One stack + disciplined navigation primitives** (collapse-to-base on section switch, `navigate` for the player) + persistent chrome moved to the root layout.
C) Leave it; document the back behavior.

**Chose:** **B**. Single source of truth `apps/mobile/src/navigation.ts`: `switchTo` (nav bars) + `goToSection` (in-view section jumps) both `dismissAll()` (popToTop of closest stack, guarded by `canDismiss()`) then `navigate` — sections never stack, Back returns to the home tab; `openPlayer` uses `navigate` (never `push`) so the modal can't duplicate. Bottom tab bar + mini-player rendered once in the root layout (`GlobalChrome`), hidden on `/login` + `/player`. Drill-downs (`/song/[id]`, `/playlist/[id]`, Settings sub-pages, player "…" peeks) keep `push`; `generate/upload/mashup` keep `replace`.

**Reason:** Avoids a 45-file folder restructure while fixing both reported bugs at the architecture level (not per-screen). `dismissAll()`/`canDismiss()` verified present in expo-router ~56.2.8. Consequence: making chrome global means every scrollable screen must clear the tab bar — standardized on `MINIPLAYER_CLEARANCE` (16 stragglers fixed). Runtime behavior is statically verified only; on-device checklist in `apps/mobile/NAVIGATION.md`.

**Reference:** `apps/mobile/NAVIGATION.md` (full spec + call-site audit), commits `26b8b832` / `6c180f93` / `e33f6e6c`, project memory `project_mobile_navigation_model.md`. CHANGELOG `[Unreleased]`.

## 2026-06-07: Animation toolchain — keep Reanimated 4 (New Arch), wire on demand; vendor SM + Expo skills

**Context:** User asked which skills/tooling help with native transitions + animations. The app already had the high-end stack installed but unused; the Sidebar uses plain RN `Animated`.

**Findings:** New Architecture is ON (`app.json` `newArchEnabled: true`). `react-native-reanimated@4.3.1`, `react-native-worklets@0.8.3`, `react-native-gesture-handler`, `react-native-screens` are installed (SDK 56 bundled versions) but unwired: `babel.config.js` lacks `react-native-worklets/plugin` and nothing imports them. Reanimated v4 requires New Arch (satisfied).

**Chose:** Keep Reanimated 4; wire it only when first needed (add the worklets babel plugin LAST + native rebuild). For transitions reachable now without a rebuild, use expo-router `Stack.Screen` `animation` options + RN `Animated`/`LayoutAnimation`. Installed two authoritative skills project-local (`SunoFlow/.claude/skills/`, gitignored): Software Mansion `react-native-best-practices` (the Reanimated/gesture maintainers) and Expo `building-native-ui`.

**Reason:** No new native deps needed — the stack is already there and matches our arch. Vendoring the skills keeps them project-scoped without touching `~/.claude` mid-session; the official `/plugin marketplace add software-mansion-labs/skills` + `expo/skills` route (global + auto-update) is the user-run alternative. `expo-app-design` from older docs no longer exists; `building-native-ui` is the successor.

**Reference:** project memory `project_mobile_animation_toolchain.md`. CHANGELOG `[Unreleased]`.

## 2026-07-17: Mobile navigation — REAL Tabs navigator supersedes the flat-stack model (2026-06-07 entry)

**Context:** User reported navigation "unnatuerlich" after living with the 2026-06-07 model (option B: one flat stack + `dismissAll()+navigate()` discipline). A 6-lens UX review confirmed the model's structural failures: every tab switch animated as a push and remounted the target (scroll loss), Back was path-dependent, Profile was a pushed screen with a back chevron, the tab highlight was dead on ~90% of screens, the sidebar edge-swipe fought iOS swipe-back, the player modal had doubled chrome.

**Options:** A) Real Tabs navigator (restructure routes into per-tab stacks); B) keep flat stack + more call-site discipline; C) NativeTabs (`expo-router/unstable-native-tabs`).

**Chose:** **A with JS Tabs** (expo-router `Tabs`, custom tab bar) — commit `00418ad6`. All section/detail routes live in ONE shared 5-way array group `(library,playlists,favorites,history,profile)/` with per-segment `unstable_settings` anchors; chrome (custom BottomTabBar in-flow + floating MiniPlayer) lives inside the Tabs layout; the player is a headerless root modal with queue/lyrics/add-to-playlist as sheets above it and `closePlayerThen()` (group-qualified push) for content exits.

**Reason vs C (NativeTabs):** the mini-player must dock above the tab bar on iOS < 26 (BottomAccessory is iOS 26+), the design system needs full control of the bar (Geist labels, Lucide icons, surface tokens), and JS Tabs needs NO native rebuild (free-Apple-ID 7-day signing). Critical implementation facts (verified against the VENDORED react-navigation inside expo-router 56 — it no longer depends on @react-navigation/*): tab switches MUST dispatch `NAVIGATE`-by-NAME at the navigator level (`linkTo` pushes duplicate anchors onto drilled tabs; the TabRouter resolves `payload.name` ONLY — a key-only payload is a silent no-op); the segment's anchor must be the FIRST declared `Stack.Screen` (declared order defines the initial route); `closePlayerThen` must group-qualify hrefs (dismiss+push drain in one router batch over stale segments, a bare href always lands in the first group = Library).

**Reference:** `apps/mobile/NAVIGATION.md` (rewritten spec + on-device checklist), `apps/mobile/UX-REVIEW-2026-07-17.md` (full audit, 49 findings), commits `00418ad6`..`1d166e28`, project memory `project_mobile_navigation_model.md`. CHANGELOG `[Unreleased]`. Runtime device-pass still pending.

## 2026-07-17: Architecture deepening — shared core seams (queue, polling, coerce/http, asset-heal, list-resource)

**Context:** Post-UX-wave exploration (7 lenses) found the same logic stamped and drifting across runtimes: queue math duplicated between the mobile playback singleton and the web's queue-ops reducer, the generation-poll loop triplicated (one copy had already regressed), ~136 hand-rolled boundary coercions with 9 divergent local helpers, the CDN refresh-and-heal recipe copied 5-6x with a custom-cover-clobber bug, and 8+ list screens each hand-rolling load/revalidate/refresh with FOUR different liveness mechanisms.

**Chose (commit `b2c93ff1`):** deep modules behind small interfaces — `@sunoflow/core`: `queue.ts` (pure reducer machine + poll helpers; BOTH runtimes consume), `polling.ts` (`runGenerationPoll`), `coerce.ts` + `http-client.ts` (`createJsonClient`, ONE `HttpError` class identity across web/mobile/react-query). Web: `songs/asset-refresh.ts` (`refreshSongCdnUrls` with custom-cover guard + `healAudio:false` so cover requests can never rewrite a healed audioUrl) + `images/proxy.ts` (`proxyImage` mirroring `proxyAudio`), `advancePendingSong` dispatcher (SSE/status/sweep keep their policies as params). Mobile: `useListResource` (ONE liveness mechanism: generation counter; silent focus revalidate; `mutate`/`revalidate` for optimistic post-actions) + `usePollingJob`.

**Documented divergence:** web `toggleShuffleQueue` keeps the duplicate-preserving INDEX-filter locally (core's id-filter dedupe is the mobile semantic — a user-queued duplicate must survive shuffle on the web); core `reorderQueue` re-points by index arithmetic (duplicate-safe, fixes a latent first-occurrence bug both sides carried). `inspire.tsx` deliberately NOT on `useListResource` (null-is-success digest, flag-driven spinner, imperative POST-sets-data — 3 structural mismatches).

**Reason:** deletion test passed everywhere (complexity reappears across N callers), locality (one place per policy), and the test surface: the queue/poll/heal logic — previously device-only-verifiable — now has ~120 table-driven tests at root vitest (suite 1788 green). Adversarial verification (6 lenses) caught 1 major + 7 minors before commit; all fixed with regression tests.

**Reference:** commit `b2c93ff1`, CHANGELOG `[Unreleased]`. Deployed to Railway (SUCCESS, health 200).

## 2026-07-20: `Song.rating` is the canonical rating store; the `Rating` table is deprecated

**Decision:** `Song.rating` / `Song.ratingNote` (Store B) is the single canonical rating store. The legacy `Rating` table (Store A, `/api/ratings`, `src/lib/ratings.ts`) is write-dead and deprecated. All reads + writes (web + mobile) go through `Song.rating` via `/api/songs/[id]/rating`.

**Why:** the C1 audit found both platforms already WRITE `Song.rating`; Store A had zero live writers. The only remnants were a vestigial Store-A fallback read (could surface a stale legacy rating) and a dashboard that showed two divergent averages (one per store). Consolidating both onto `Song.rating` (`3fe36a1f`) removed the divergence non-destructively.

**Non-destructive:** no rows migrated/dropped. The `Rating` table + `/api/ratings` route stay in place (write-dead, harmless); retiring that endpoint is a separate, deferred call. The `SongRating` TYPE (`src/lib/ratings.ts`) is still used and stays.

## 2026-07-20: Wave A brand migration is web-only by design; A8 public surfaces deferred

**Decision:** the Wave A migration (dark-first, Electric Magenta, Lucide, semantic tokens) targeted the WEB app only. The mobile app already carried this brand from the M004 work (`theme.ts` Electric Magenta + dark tokens, 57 Lucide files / 0 Heroicons) — Wave A brought web UP to mobile's standard, not the reverse.

**A8 (public/embed/landing) deliberately NOT migrated:** `PublicSongView`, `LandingPage`, `PublicProfileView`, `PublicPlaylistView`, the embed players, `OnboardingTourUI`. Their indigo-violet gradients violate the One-Spark rule and need a flat-surface redesign, not a mechanical Heroicon/token swap — an open operator/design call. Everything else on the authed surface is migrated (~250 files across batches 2/3/9).

## 2026-07-20: Web navigation consolidated (17 → 10) behind tabbed hubs; deeper content merges deferred

**Context:** A critical synthetic-user panel (8 divergent personas, unanimous — *synthetic-panel signal*, not real-user data) judged the flat 17-item sidebar an undifferentiated "directory": no hierarchy, no start-here, Generate buried as the fifth gray row, and several synonym clusters that made confident single-clicks impossible. Findability failed outright on two of four core tasks — "find others' music" (Feed/Radio/Explore/Discover) and "how are my songs doing" (Analytics/My Stats + a hidden `/insights`). A per-page characterization of the 8 cluster pages then established which are true duplicates vs. load-bearing.

**Chose (two phases, both live):**
- **Phase 1** (`09d74278`) — non-destructive: group items into labeled sections (Create / My Music / Browse), promote Generate to the filled primary CTA. No routes touched.
- **Phase 2** (`f780550f`) — consolidate the clusters: `/explore` (a literal `/discover` duplicate: same `DiscoverView` + same `getInitialBrowseSongs` query) 301-redirects to `/discover`; Radio (reachable from song cards) and Feed (empty in the closed beta) leave the nav; `/analytics` + `/stats` + the un-linked `/insights` collapse behind one "Insights" destination; `/history` + `/generations` group under Library. A shared `SectionTabs` component turns each cluster into one destination with tabs (Overview/Production/Listening; Songs/Recently Played/Generation History). Favorites stays a Library filter chip (the `nav-favorites` onboarding anchor moved onto that chip).

**Non-destructive:** every feature stays reachable (tab / chip / redirect / song-card entry); no route deleted, no view merged. Net: sidebar 17 → 10 items, all above the fold, Generate the hero.

**Deferred (tracked in STATE):** the three Insights *views* still have overlapping content (grouped by tabs, not yet deduped); Feed has no home (a "Following" tab under Profile once the social graph has adoption); Radio has no browse-hub tab; `/explore/page.tsx` is now dead code behind the redirect. Content/UX polish, not blockers.

**Reference:** commits `09d74278` (Phase 1), `f780550f` (Phase 2), player-overlap fix `6eb8086c`; `src/components/SectionTabs.tsx`, `src/components/AppShell.tsx`. Synthetic-panel run + per-page characterization workflow this session. CHANGELOG `[Unreleased]`.

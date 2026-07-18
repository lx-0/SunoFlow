# Wave A + C Execution Plan — 2026-07-18

> Execution-level deep research (6 lenses) turning the improvement-wave
> program (IMPROVEMENT-WAVES-2026-07-18.md) into implementable blueprints.
> Every step carries file:line evidence — implementation agents should not
> need further research. Wave 0 shipped same day (`7fef0ed2` + hotfix
> `7872a8f4`, live on Railway incl. the PlaybackState migration).

## Headline findings

1. **Dark-first is CHEAP**: the web app is dark-capable, not light-only —
   `darkMode: "class"`, a working ThemeProvider toggle, and 3867 existing
   `dark:` variants. The flip = default-to-dark resolution + a gray→tinted
   neutral ramp alias (same trick as the shipped violet→magenta bridge) +
   globals.css var corrections + closing the few no-dark-variant surfaces.
2. **The icon debt is one map away**: 171 files import Heroicons, 0 use
   Lucide; 125 distinct symbols. A canonical symbol map + size/stroke
   convention makes every later swap lookup-not-decision.
3. **One-file levers exist**: `chart-config.ts` recolors all five analytics
   chart components; AppShell + global player frame ~25 routes.
4. **The billing bug is real and quantified**: balance =
   subscriptionBudget + SUM(unexpired top-ups) − SUM(usage since month
   start) — top-ups are never decremented by lifetime consumption, so
   purchased credits replenish monthly. FIFO ledger blueprint below.
5. **Mobile telemetry requires a native rebuild** (`@sentry/react-native`
   config plugin) — sequence it WITH the pending device pass, one rebuild.

## Recommended sequencing

- **Wave A (web brand)**: A0 token foundation → A1 icon map → dark-first
  flip (cheap, from lens 2) → A2 shared chrome → A3 one-file levers →
  A4 core-loop components → A5–A9 route batches. Ship per batch behind the
  visual harness (baseline screenshots → migrate → diff).
- **Wave C (reliability)**: C3 billing ledger FIRST (user-money correctness),
  then FileCache eviction + cron run-history + migrate-drift removal
  (blueprints below), mobile CI job (tsc+lint now; the two prerequisites —
  vitest-import tsc break + missing expo-lint config — are part of the job),
  mobile telemetry bundled with the device-pass rebuild.
- **Wave 0 residue**: fix the fixme'd playlist-persistence e2e (picker
  dropdown never renders in CI — needs local repro with E2E_SEED_SONGS=true).

Open operator calls (unchanged): mashup paywall, tap→full-player, dead
covers, prod test-song hygiene, light-theme fate (lens 2 recommends: ship
dark-only-by-default, keep the toggle wired, polish light later).

Full blueprints per lens below.

## Wave C — CreditTopUp Ledger (billing correctness)

The credit balance in src/lib/credits/index.ts is computed as `subscriptionBudget + SUM(unexpired CreditTopUp.credits) - SUM(CreditUsage.creditCost since startOfMonth)`. Because the top-up sum is never decremented by lifetime consumption and the usage window resets every calendar month (implicitly, via the `createdAt >= startOfMonth` filter — there is no counter and no reset job), one-time purchased credits fully replenish on the 1st of each month until their ~1-year expiry. This gates real generation (checkCredits → all deduction sites: generation/core.ts:137, execute.ts:43, rss/auto-generate.ts:178, batch.ts:57), so it is a revenue-correctness bug, currently latent only because the closed beta is 100% free with (almost certainly) zero CreditTopUp rows. The fix is a durable consumption ledger: add `consumedCredits` to CreditTopUp, split the balance into a month-windowed subscription pool plus a lifetime top-up pool, and debit top-ups FIFO at spend time inside a transaction. `CreditUsage` rows are durable (not in the retention purge) and top-up grant idempotency is already robust via `stripeSessionId @unique`, so the redesign is low-risk; the same root cause also silently expires admin credit grants (adjustUserCredits writes negative month-windowed CreditUsage rows) and there is no refund/chargeback handler, both of which should be addressed alongside.

### [S] Add a durable consumed-counter to CreditTopUp (schema + migration)

Add `consumedCredits Int @default(0)` to the CreditTopUp model in prisma/schema.prisma (model at ~lines 894-910, between `expiresAt` and `createdAt`). Generate a raw SQL migration under prisma/migrations/<ts>_add_credit_topup_consumed/migration.sql: `ALTER TABLE "CreditTopUp" ADD COLUMN "consumedCredits" INTEGER NOT NULL DEFAULT 0;` (mirror the hand-written style of prisma/migrations/20260718000000_playback_state_song_set_null/migration.sql — this repo writes migration.sql by hand, no prisma migrate dev in CI). The DEFAULT 0 IS the backfill for existing rows (see step 6). Add an index only if FIFO ordering needs it — the existing `@@index([userId, expiresAt])` already covers the FIFO scan.

_Files:_ prisma/schema.prisma`, prisma/migrations`

### [S] Make topUpCreditsRemaining net of lifetime consumption

Rewrite getTopUpCreditsRemaining (src/lib/credits/index.ts:137-147). Today it does `creditTopUp.aggregate({ _sum: { credits } })` over unexpired rows. Change to fetch rows and return `SUM(credits - consumedCredits)` for unexpired rows (either aggregate both columns and subtract, or findMany the two fields and reduce). This is the single change that stops the monthly replenish: the top-up pool becomes a lifetime pool that only shrinks.

_Files:_ src/lib/credits/index.ts`

### [M] Split the balance formula: month-windowed subscription pool + lifetime top-up pool

Rewrite analyzeUsage (src/lib/credits/index.ts:76-107). Today: `budget = subscriptionBudget + topUpCredits; creditsRemaining = max(0, budget - creditsUsedThisMonth)` — this is the bug because both pools reset together on the monthly window. New formula: `subscriptionConsumedThisMonth = min(subscriptionBudget, creditsUsedThisMonth)`; `subscriptionCreditsRemaining = max(0, subscriptionBudget - subscriptionConsumedThisMonth)`; `topUpCreditsRemaining = <lifetime net pool passed in from getTopUpCreditsRemaining>`; `creditsRemaining = subscriptionCreditsRemaining + topUpCreditsRemaining`. Change the param the orchestrator passes: getMonthlyCreditUsage (214-225) must pass the NET lifetime top-up remaining (not the gross purchased sum) into analyzeUsage, and analyzeUsage no longer derives topUpCreditsRemaining from `topUpCredits - topUpCreditsConsumed`. Keep `budget`, `usagePercent`, `isLow`, `dailyChart`, all-time totals for the UI (settings/billing/page.tsx:521,553-555 reads creditsRemaining + topUpCreditsRemaining; /api/credits/route.ts returns the whole object).

_Files:_ src/lib/credits/index.ts`

### [M] Debit top-ups FIFO at spend time inside a transaction

Rewrite deductCredits (src/lib/credits/index.ts:240-258). Today it only inserts a CreditUsage row. New flow, wrapped in prisma.$transaction: (1) insert the CreditUsage row as today (keeps monthly analytics + dailyChart intact); (2) compute how much of THIS spend exceeds the month's remaining subscription allowance = `overflow = max(0, (subscriptionConsumedThisMonth_after) - subscriptionBudget)` i.e. the portion drawn from top-ups; (3) debit `overflow` across unexpired CreditTopUp rows ordered FIFO by `expiresAt ASC NULLS LAST, createdAt ASC`, each capped at `credits - consumedCredits`, via conditional updateMany `WHERE id=? AND consumedCredits + delta <= credits` to prevent over-debit under concurrency. All deduction call sites inherit this automatically — verified sites: src/lib/generation/core.ts:137 (real Suno path), src/lib/generation/execute.ts:43 (mock/no-key path), src/lib/rss/auto-generate.ts:178 (feed auto-gen). checkCredits (227-238) and batch.ts:57 pre-check read the corrected creditsRemaining with no change needed.

_Files:_ src/lib/credits/index.ts`, src/lib/generation/core.ts`, src/lib/generation/execute.ts`, src/lib/rss/auto-generate.ts`

### [M] Verify + harden Stripe webhook idempotency for the grant path

Grant idempotency is currently carried solely by the `stripeSessionId @unique` guard in handleTopupCheckoutCompleted (src/lib/billing/index.ts:116-134): the event-id dedup hasProcessedStripeEvent (webhook.ts:104-110) is a NO-OP for checkout events because handleCheckoutCompleted never calls recordPaymentEvent. The ledger redesign does NOT weaken this (the counter is debited on SPEND, not on grant), but add a regression test that delivering checkout.session.completed twice yields exactly one CreditTopUp and untouched consumedCredits. Optional hardening in the same pass: record a PaymentEvent for checkout.session.completed so the event-id guard becomes real, and add a `charge.refunded`/`charge.dispute.created` case to handleBillingEvent (255-278) that zeroes/expires the matching CreditTopUp — today refunds fall through to recordUnhandledEvent and the user keeps the credits (overcharge-to-operator).

_Files:_ src/lib/billing/index.ts`, src/lib/billing/resolve.ts`, src/lib/billing/webhook.ts`

### [S] Backfill strategy for existing purchases

Beta is 100% free, so prod almost certainly has ZERO CreditTopUp rows — verify with a one-off count before deploying. If zero: the `DEFAULT 0` column IS the backfill, nothing else to do. If non-zero: precise historical attribution is impossible (CreditUsage rows were never source-tagged), so set `consumedCredits = 0` for all pre-existing top-ups as a deliberate one-time user-favorable amnesty (documented in the migration comment) — safe because no real money changed hands. Do NOT attempt to reconstruct past monthly overflow retroactively; it would mis-charge users on ambiguous data.

_Files:_ prisma/migrations`, prisma/schema.prisma`

### [S] Decide + fix the admin-grant durability (same root cause, opposite sign)

adjustUserCredits (src/lib/admin/users.ts) writes a CreditUsage row with `creditCost: -amount`, so an operator granting compensation credits ALSO loses them at the next month boundary (the grant is a negative row inside the monthly window). This is the identical class of bug. Recommended: route positive admin grants through a CreditTopUp row (no expiry, or long expiry) so they persist and debit FIFO like purchased credits, and keep negative adjustments as CreditUsage. Alternatively document that admin adjustments are intentionally month-scoped. Leaving it as-is means every admin credit grant silently evaporates monthly.

_Files:_ src/lib/admin/users.ts`

### [M] Test matrix (regression + new ledger behavior)

Add to src/lib/credits/index.test.ts / calculate.test.ts and a webhook test: (a) REGRESSION for the silent replenish — subscription 200 + one 100-credit top-up, consume 250 in month 1 (topUpRemaining=50, subRemaining=0), advance the mocked clock/window to next month, assert creditsRemaining==250 NOT 300 (fails on current code, passes after fix); (b) FIFO drains the earliest-expiring top-up first across two top-ups; (c) an expired top-up's unconsumed remainder is excluded but its recorded consumedCredits is not resurrected; (d) single-month overflow: sub 200 + topup 100, consume 210 → consumedCredits=10, topUpRemaining=90, subRemaining=0; (e) checkCredits gate blocks only when BOTH sub-month and lifetime top-up pools are drained; (f) concurrent deductCredits never drives consumedCredits above credits (conditional update); (g) duplicate checkout.session.completed → one CreditTopUp; (h) refund handler (if added) zeroes the pool. Update the existing analyzeUsage assertions in calculate.test.ts:52-55 (they assert budget=600/remaining from the old additive formula) and the index.test.ts topup mocks (they stub creditTopUp.aggregate with a plain _sum.credits) to the new net-of-consumed shape.

_Files:_ src/lib/credits/index.test.ts`, src/lib/credits/calculate.test.ts`, src/app/api/billing/webhook/route.test.ts`

**Risks:**
- Formula-shape change ripples to the UI and API: MonthlyCreditUsage is returned wholesale by /api/credits/route.ts and rendered by settings/billing/page.tsx (creditsRemaining line 521, topUpCreditsRemaining lines 553-555). Verify the returned object keeps the same keys; the numbers change (top-ups no longer replenish) so a beta user who 'had' replenished credits will see a lower balance after deploy — expected, but communicate it.
- Existing tests WILL break and must be updated, not deleted: calculate.test.ts:52-55 asserts the old additive `analyzeUsage(500,100)→budget 600` behavior, and index.test.ts stubs creditTopUp.aggregate as a plain `_sum.credits`. If left unchanged the suite fails; if 'fixed' by loosening assertions the regression coverage is lost. Verify by running `pnpm vitest src/lib/credits`.
- FIFO debit must be atomic. Two concurrent generations (mobile Bearer traffic is unthrottled per the security lens) can race the consumedCredits update; use a conditional updateMany (`WHERE consumedCredits + delta <= credits`) inside prisma.$transaction and assert no over-debit in a concurrency test.
- Timezone assumption: getMonthlyCreditUsage computes startOfMonth with `new Date(y, m, 1)` (server-local) while CreditUsage.createdAt and the raw `DATE("createdAt")` SQL are UTC. On Railway (UTC) these coincide, but the subscription month-boundary reset silently depends on it — verify TZ or switch to explicit UTC month start.
- Backfill correctness hinges on prod having zero CreditTopUp rows. Verify with a count before migrating; if any exist, the amnesty (consumedCredits=0) is the safe choice but means those specific users keep one free replenishment cycle. Don't attempt retroactive attribution.
- Scope creep from the refund handler: adding charge.refunded is correct but touches the webhook switch and needs its own idempotency (match CreditTopUp by paymentIntent/session). It can ship as a separate follow-up; the core ledger fix (steps 1-4) is independently correct and deployable.
- Admin-grant fix (step 7) changes operator-facing behavior; if deferred, flag loudly in docs that admin credit grants currently expire monthly so support doesn't hand out compensation that vanishes.


## Wave A — Visual Verification Harness

The repo already contains every primitive this harness needs; the job is wiring, not invention. The verified local prod-run recipe (KNOWLEDGE.md:60) is: `next build` then `next start -p 80 -H 0.0.0.0` (macOS allows the unprivileged 0.0.0.0:80 bind; any other port triggers the middleware port-strip self-redirect, and `next dev` dies with EMFILE), driven by Playwright with `PLAYWRIGHT_REMOTE=true BASE_URL=http://127.0.0.1` so Playwright uses the externally-managed server (playwright.config.ts:43-51). Crucially, the 'keyless mock-fallback generate' path is real and seed-capable: with no SUNOAPI_KEY and PLAYWRIGHT_TEST=true, `POST /api/generate` persists an instantly-ready Song row with a self-contained SVG data-URL cover and zero paid calls (execute.ts:37-49, core.ts:85-106, cover-art-generator.ts) — the exact pattern e2e/playlists.spec.ts:113-149 already uses, so a visually-rich library seeds with no network and no Suno spend (caveat: stored titles all read 'Neon Drift' unless a small Prisma seed varies them). Recommended build: a wrapper script scripts/visual-journey.sh (throwaway 5433 DB + port-80 keyless server + run), a separate playwright.visual.config.ts (desktop 1440x900 + Pixel-5 mobile, reduced motion, no self-managed server), and a self-registering journey spec e2e/visual/journey.visual.ts that seeds ~15 songs/playlists/favorites then screenshots ~18 authed surfaces plus login/register into visual-artifacts/<label>/. For the Wave-A loop, capture a committed baseline set on the pre-Wave-A build, re-run per migration batch, and produce an informational pixelmatch diff for human before/after eyes (not a pass/fail gate, since Wave A recolors everything by design).

### [M] Add the local prod-run wrapper script scripts/visual-journey.sh that encodes the repo's verified port-80 recipe + throwaway keyless DB + server lifecycle

The KNOWLEDGE.md:60 recipe is confirmed against current code and is the ONLY reliable local prod-run: `next dev` dies with EMFILE (watchpack) even at ulimit 65536, and `next start` on any non-default port self-redirects every locale page with the port stripped (Next sets x-forwarded-host; normalizeRedirectLocation in src/middleware.ts rewrites Location to the portless host). Only port 80 makes the strip a no-op, and macOS allows the unprivileged low-port bind on 0.0.0.0 but NOT 127.0.0.1. So the script must: (1) start a throwaway Postgres on 5433 matching .env.example:8,10 (`docker run -d --name sf-visual-db -e POSTGRES_USER=projects -e POSTGRES_PASSWORD=projects -e POSTGRES_DB=sunoflow -p 5433:5432 postgres:16-alpine`), export DATABASE_URL and SUNOFLOW_DATABASE_URL to `postgres://projects:projects@localhost:5433/sunoflow`, run `pnpm exec prisma migrate deploy`. NOTE the divergence: docker-compose.yml:10-11 uses port 5432/user sunoflow, .env.example uses 5433/projects — the visual harness must pin 5433/projects to match .env.example and NOT collide with a running compose db. (2) `pnpm build`. (3) Start the server keyless so the mock fallback is active and with the test bypasses on: `env -u SUNOAPI_KEY PLAYWRIGHT_TEST=true NODE_ENV=production AUTH_URL=http://127.0.0.1 pnpm exec next start -p 80 -H 0.0.0.0 &` then poll `until curl -sf http://127.0.0.1/api/health; do sleep 1; done`. PLAYWRIGHT_TEST=true is REQUIRED on the server process: it enables /api/test/login (src/app/api/test/login/route.ts:28), skips the register rate-limit + invite gate (src/app/api/register/route.ts:24-25), and disables the sliding-window limiter (src/lib/rate-limit/sliding-window.ts:234). Empty SUNOAPI_KEY makes /api/generate take the keyless branch. (4) `rm -f e2e/.shared-user.json` before running (see step 4 gotcha). (5) Run playwright (step 2 config) with `PLAYWRIGHT_REMOTE=true BASE_URL=http://127.0.0.1 VISUAL_JOURNEY=true VISUAL_LABEL=<baseline|after> pnpm exec playwright test --config=playwright.visual.config.ts`. PLAYWRIGHT_REMOTE=true makes playwright.config's webServer undefined (playwright.config.ts:43-51) so Playwright drives the externally-managed server instead of trying to boot its own. (6) trap-kill the server + optionally `docker rm -f sf-visual-db` on exit.

_Files:_ `scripts/visual-journey.sh`, `.ytstack/KNOWLEDGE.md`, `playwright.config.ts`, `.env.example`, `docker-compose.yml`

### [S] Add a dedicated visual config playwright.visual.config.ts with desktop+mobile projects, raw-screenshot output, reduced motion, and no self-managed webServer

Keep the normal e2e run untouched by using a separate config rather than editing playwright.config.ts (which only defines one chromium Desktop-Chrome project, playwright.config.ts:32-40). New config: `testDir: './e2e/visual'`, `testMatch: '**/*.visual.ts'`, `fullyParallel:false`, `webServer: undefined` (server is externally managed by the wrapper — mirrors the PLAYWRIGHT_REMOTE path), `use.baseURL` from BASE_URL, `use.locale:'en-US'`, `use.serviceWorkers:'block'` (same reason as playwright.config.ts:28 — the SW's stale-while-revalidate on /api/songs bypasses interception), and two projects: `visual-desktop` = `{...devices['Desktop Chrome'], viewport:{width:1440,height:900}}` and `visual-mobile` = `{...devices['Pixel 5']}` (393x851) — covers the DESIGN.md desktop console + the 5-tab mobile bottom nav (AppShell.tsx:509 renders navItems.slice(0,5)). Set `use.reducedMotion:'reduce'` and inject a global stylesheet disabling animation/transition to stabilize shots (globals.css has theme-transition at :84-89 and emoji-float at :139-148). Do NOT use expect(page).toHaveScreenshot() as the primary output: Wave A intentionally recolors 1752 literals app-wide, so a pixel-assert gate would 'fail' on every surface by design. Instead the spec writes raw PNGs via page.screenshot() into `visual-artifacts/${process.env.VISUAL_LABEL}/${project}/<NN-surface>.png`. Add `visual-artifacts/` to .gitignore (alongside the existing /test-results/ and /playwright-report/ entries at .gitignore:11-16). Optionally keep a `toHaveScreenshot` variant behind a flag for surfaces expected to stay stable, but the before/after human-eyes flow is the raw-PNG folders.

_Files:_ `playwright.visual.config.ts`, `playwright.config.ts`, `src/app/globals.css`, `.gitignore`

### [M] Write the journey spec e2e/visual/journey.visual.ts: self-registering seed user, in-test library seeding, ~18 authed surfaces + player states, both viewports

Reuse the proven helpers rather than re-inventing. Skeleton: `test.describe.configure({mode:'serial'})`; a module-scoped `const email = uniqueEmail('visual'); const password = DEFAULT_PASSWORD;` (helpers.ts:5-9). `test.beforeAll`: `await registerUser(BASE_URL, {name:'Visual Journey', email, password})` (helpers.ts:11-26 — works because PLAYWRIGHT_TEST bypasses the gates). Do NOT rely on global-setup's shared user: global-setup.ts:38-42 REUSES e2e/.shared-user.json if present, which is stale against a fresh throwaway DB and would make login fail — the wrapper deletes it and this spec registers its own user, so keep the visual config's globalSetup unset. Seeding (answers the research question — YES the keyless mock-fallback can seed a real library, with caveats): loop ~15x `await page.request.post('/api/generate', {data:{title:`Seed ${i}`, prompt:'...', tags:'<varied genre>'}})` after logging in; each call hits src/app/api/generate/route.ts:24,38 → executeGeneration !hasApiKey branch (src/lib/generation/execute.ts:37-49) → creates a REAL generationStatus='ready' Song row with ZERO paid calls, and afterCreation runs with coverArt:true (route.ts passes coverArt:true) so src/lib/generation/core.ts:85-106 calls generateCoverArtVariants and stores a self-contained SVG data: URL as imageUrl (src/lib/cover-art-generator.ts is fully local, no network; CSP allows img-src data: per next.config.mjs) — so seeded cards render real covers headless. CAVEAT to document in a comment: core.ts:55 uses `input.mock.title || base.title`, and /api/generate always passes mockFallback=mockSongs[0] (route.ts:38), so every seeded row's stored TITLE is 'Neon Drift' and tags 'synthwave, electronic, instrumental' (src/lib/sunoapi/mock.ts:8-20) regardless of the request — but the COVER art is generated from the request's title/tags (core.ts:93-97), so covers still differ per call. Assert generationStatus==='ready' after each seed (the guard from playlists.spec.ts:142-147) to abort loudly if a real key is present. Also create 2 playlists (createPlaylistViaUI, helpers.ts:255) with a couple songs and favorite 2 songs so /favorites and /playlists/[id] are non-empty. Then per project (desktop+mobile) walk the surfaces, calling `await loginViaUI(page, email, password)` first (helpers.ts:28-123 — uses /api/test/login, and pre-sets sunoflow-tour-completed + apikey-wizard-dismissed at :49-52 so no modal covers the shot). Pin theme deterministically with `page.addInitScript(()=>localStorage.setItem('sunoflow_theme','dark'))` (or capture BOTH 'dark' and 'light' passes) — the inline script at src/app/[locale]/layout.tsx:133 reads that key. For each surface: goto, `await page.waitForLoadState('networkidle')`, dismiss any residual banner, `await page.screenshot({path, fullPage:true})`. Surface list (~18, drawn from AppShell navItems AppShell.tsx:60-76 and the [locale] route inventory): /, /library, /library/<seededId>, /generate, /mashup (paywalled at free — captures the lock state, which is itself a Wave-A/feature-gate surface), /inspire, /templates, /style-templates, /personas, /playlists, /playlists/<id>, /favorites, /history, /discover, /settings, /settings/billing, /profile, /pricing. Plus 2 unauth surfaces (/login, /register) captured without login, and 1 player state: play a seeded song to surface the mini-player/ExpandedPlayer chrome (audioUrl is empty so playback won't start, but the player bar mounts — capture it).

_Files:_ `e2e/visual/journey.visual.ts`, `e2e/helpers.ts`, `e2e/global-setup.ts`, `src/app/api/generate/route.ts`, `src/lib/generation/core.ts`, `src/lib/sunoapi/mock.ts`, `src/components/AppShell.tsx`

### [M] (Optional richness upgrade) Add scripts/seed-visual-library.ts (tsx + Prisma) to seed a title/genre/lyric-VARIED library for the seed user

The API loop in step 3 seeds real rows but every stored title is 'Neon Drift' (core.ts:55 precedence). If the operator wants a genuinely varied grid (6 distinct titles/genres/lyrics), add a small tsx script that runs against the throwaway 5433 DB AFTER migrate: look up the user by email (or upsert one with a bcryptjs hash of DEFAULT_PASSWORD matching the register flow), then for i in 0..14 `prisma.song.create` using `mockSongs[i % mockSongs.length]` (src/lib/sunoapi/mock.ts:7-88 — Neon Drift / Summer Rain / Hyperspeed / Mountain Echo / Late Night Jazz / Digital Heart, several with lyrics) with generationStatus:'ready', and set imageUrl to `generateCoverArtVariants({songId,title,tags})[0].dataUrl` (src/lib/cover-art-generator.ts) for a per-title cover. Also create 2-3 playlists with PlaylistSong links and flip isFavorite on a few. Run via `env DATABASE_URL=postgres://projects:projects@localhost:5433/sunoflow pnpm exec tsx scripts/seed-visual-library.ts --email <seed-email>`. This mirrors the batch path's variety (src/lib/generation/batch.ts:85 uses mockSongs[i%len]) without touching Suno. Wire it as an alternate seed mode in the wrapper (env SEED_MODE=rich) so step 3's in-test API seeding stays the zero-coupling default.

_Files:_ `scripts/seed-visual-library.ts`, `src/lib/sunoapi/mock.ts`, `src/lib/cover-art-generator.ts`, `src/lib/generation/batch.ts`

### [M] Add the baseline + diff mechanism and document the Wave-A loop integration

The loop: (a) BEFORE starting Wave A — check out the current pre-Wave-A commit (or run now, since Wave 0 shipped at 7fef0ed2 and Wave A hasn't started), run `scripts/visual-journey.sh` with VISUAL_LABEL=baseline → produces visual-artifacts/baseline/{visual-desktop,visual-mobile}/*.png. Move/commit that set to a stable location e.g. `e2e/visual/__baseline__/` (this IS committed to git — it is the 'before' reference; it is small PNGs). (b) PER migration/PR batch during Wave A — run the wrapper with VISUAL_LABEL=after → visual-artifacts/after/. (c) DIFF: add a tiny compare step `scripts/visual-diff.mjs` using pixelmatch+pngjs (or the `odiff` CLI) that walks matching filenames in __baseline__/ vs after/, writes a heatmap PNG + a per-surface changed-pixel-ratio into visual-artifacts/diff/ and prints a summary table. Because Wave A recolors everything, treat the diff as an INFORMATIONAL report for human review (did AppShell recolor as intended? did any surface break/blank/overflow?), not a hard gate — exit 0 always, just surface the numbers. Add npm scripts: `"visual": "bash scripts/visual-journey.sh"` and `"visual:diff": "node scripts/visual-diff.mjs"` to package.json (scripts block, package.json:5-24). Document the whole loop in a short e2e/visual/README.md: the exact 6 wrapper commands, when to re-baseline (after each Wave-A batch lands, promote after/ → __baseline__/), and the known caveats (all-Neon-Drift titles unless SEED_MODE=rich; empty audio so no real playback; mashup shows the free-tier lock).

_Files:_ `scripts/visual-diff.mjs`, `e2e/visual/README.md`, `package.json`, `e2e/visual/__baseline__`

**Risks:**
- Port 80 bind: the recipe requires binding 0.0.0.0:80 on macOS (works unprivileged per KNOWLEDGE.md:60) — if the implementing machine/CI is Linux or 127.0.0.1-only, port 80 will need sudo/cap_net_bind or the port-strip bug reappears on other ports. Verify with `curl -sf http://127.0.0.1/api/health` returning 200 and no redirect; if it 3xx-strips the port, you are not on port 80.
- Stale e2e/.shared-user.json (gitignored, .gitignore:13) silently makes global-setup skip registration (global-setup.ts:38-42); against a fresh throwaway DB the referenced user won't exist and login fails. Mitigation baked in: wrapper deletes it and the journey self-registers a unique user; verify login by asserting the URL leaves /login (helpers.ts:57).
- Seeding variety: /api/generate always uses mockSongs[0] so stored titles all read 'Neon Drift' (core.ts:55). If a reviewer needs distinct titles to judge typography/wrapping, they MUST run SEED_MODE=rich (scripts/seed-visual-library.ts). Verify by checking the library grid shows >1 distinct title.
- Real-key safety: if SUNOAPI_KEY leaks into the server env (e.g. sourced from .env), /api/generate starts REAL paid generations instead of mock rows. The seed asserts generationStatus==='ready' and aborts otherwise (playlists.spec.ts:142-147) — keep that guard; verify by confirming no 'pending' rows and zero Suno credit spend.
- Empty audioUrl on mock songs (mock.ts audioUrl:'') means playback never starts, so any player/waveform surface renders its idle/empty state, not a playing state — acceptable for brand diffing but note the ExpandedPlayer 'playing' visuals can't be captured this way.
- Diff noise: Wave A changes ~1752 color literals app-wide, so every surface diffs heavily by design — do NOT wire toHaveScreenshot as a CI gate or it fails everywhere. Keep the diff informational (exit 0). Verify the diff script prints ratios without failing the run.
- Data-URL covers depend on CSP img-src allowing data: (next.config.mjs:191) and next/image not rejecting data URLs — if a future CSP tightening drops data:, seeded covers go blank. Verify covers render in the baseline PNGs before trusting the after set.


## Wave A — Dark-First Flip Mechanics

The web app is not actually light-only by architecture — it is dark-capable but dark-defaulted-off. Tailwind runs `darkMode:\"class\"`, a custom ThemeProvider toggles `.dark` on <html> (there is no next-themes; a 5-copy inline no-flash script + matchMedia handle prefers-color-scheme), and 3867 `dark:` variants across 190/275 tsx files already supply a dark treatment for nearly every surface. It renders light in PROD only because the unstored default resolves to system/light, and even the dark path uses untinted grays that violate DESIGN.md's Tinted-Neutrals rule. The fastest coherent flip therefore mirrors the already-shipped violet→magenta bridge: (1) change 6 default sites to resolve dark when no pref is stored, and (2) alias Tailwind's `gray` ramp to a lightness-preserving magenta-tinted stack landing DESIGN.md's surface-deep/surface/surface-raised hex — flipping ~190 files in one build without inverting a single `dark:` variant. Keep the `.dark` class (not data-theme); introduce semantic surface tokens (bg-surface-raised, text-primary) backed by the already-present-but-unconsumed globals.css vars only on touch. Blockers are small and contained: ~52 bg-white and ~10 text-gray-900 lines lack a dark: counterpart (concentrated in discover-view.cards, not-found, api-docs, a few settings sections); player chrome is already dark-only and embeds are intentionally dual, so both are non-blocking. The mobile theme.ts already holds the canonical DESIGN.md hex — lift it into packages/core (@sunoflow/core) as the single source and regenerate both sides. Ship dark-as-default with the toggle kept but light deferred, exactly as DESIGN.md mandates.

### [S] Flip the default theme resolution to dark (behavioral dark-first, no variant inversion)

The app is ALREADY dark-capable: Tailwind `darkMode:"class"` (tailwind.config.ts:27), a custom ThemeProvider toggles `.dark` on <html>, and 3867 `dark:` variant occurrences across 190/275 tsx files supply a dark value for almost every surface. The ONLY reason PROD renders light is the default resolves to `system`/light. Change 6 default sites so an absent stored pref resolves to DARK (not matchMedia): (1) ThemeProvider.tsx:18 getSystemTheme SSR fallback already returns "dark" — keep; (2) ThemeProvider.tsx:30 getStoredTheme returns "system" default → this is fine IF the resolve-of-system defaults dark, but simplest is to make the no-pref default "dark" outright; (3) ThemeProvider.tsx:56 `stored==="system" ? getSystemTheme() : stored` — leave system honoring OS only when the user explicitly picked it, but change the initial unstored state to dark; (4-8) the 5 identical inline no-flash scripts (src/app/[locale]/layout.tsx:133, and src/app/songs|u|s|p/layout.tsx:32) currently do `t==="dark" || (t!=="light" && matchMedia(dark))` — change the unstored branch to force `.dark` (i.e. add `.dark` unless t==="light"). All 5 MUST change together or public pages flicker light. This single move flips ~190 files' worth of surfaces to their existing dark treatment in one build.

_Files:_ src/components/ThemeProvider.tsx`, src/app/[locale]/layout.tsx`, src/app/songs/layout.tsx`, src/app/u/layout.tsx`, src/app/s/layout.tsx`, src/app/p/layout.tsx`

### [S] Retint the neutral `gray` ramp via a Tailwind alias (parallel to the shipped violet→magenta bridge)

Today's dark surfaces are untinted gray (dark:bg-gray-800/900/950), violating DESIGN.md's Tinted-Neutrals rule even in dark mode. Fix at build time exactly like the existing magenta bridge (tailwind.config.ts:12-24,38): add `gray: <ramp>` to theme.extend.colors, lightness-preserving and magenta-tinted (hue 350, chroma ~0.01-0.015), so every existing gray utility recolors in place. Target mapping derived from the current dark usage + DESIGN.md/theme.ts hex: gray-950→surface-deep #0f090c, gray-900→surface #151012, gray-800→surface-raised #20181c, gray-700→surface-hover #2a2125, gray-600→border-strong ~#3a3034, gray-500→text-muted #686164, gray-400→text-secondary #aaa2a5, gray-300/200/100/50→tinted near-whites (for the deferred light mode). CRITICAL: only `gray` needs aliasing — a repo grep found ZERO zinc/neutral/slate/stone usages and ZERO arbitrary `bg-[#..]`/`text-[#..]` literals, so the ramp is the single lever. Must be lightness-preserving so light mode (which uses gray-50/100 as base) does not invert.

_Files:_ tailwind.config.ts`

### [S] Correct globals.css CSS-var values + app-floor to the DESIGN.md tinted stack

globals.css :root (light) still uses banned pure white (--surface:#ffffff:10, --card-bg:#ffffff:30, --background:#f9fafb:6) and .dark uses untinted grays (--surface:#111827:44, --player-bg:#1f2937:60) instead of the tinted stack. These vars are currently UNCONSUMED by components (grep for var(--surface)/text-primary in components = 0) but back the <body> and are the seam for step 4, so correct their values now: :root→tinted near-whites, .dark→#0f090c/#151012/#20181c/#2a2125/#2f262a per DESIGN.md:8-16. The <body> class `bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white` (layout.tsx:142 + 4 public layouts) becomes correct automatically once step 2's alias lands (gray-950→surface-deep). Skip-link (:116) and focus ring (:129) are already magenta #ef009c. Keep the `.dark` class mechanism — do NOT migrate to `data-theme`: that would require inverting all 3867 `dark:` variants into a `light:` scheme Tailwind has no native support for. Dark-first is achieved behaviorally (step 1), not by rewriting base classes.

_Files:_ src/app/globals.css`

### [M] Close the genuine coherence gaps: in-app light-only surfaces that carry NO dark: variant

Quantified blockers that will render light-on-dark after the flip: 52 lines use `bg-white` with no dark: counterpart, 10 lines use `text-gray-900` with no dark:text counterpart, 28 `bg-gray-50` and 42 `bg-gray-100` without dark:. Concentrations: src/app/[locale]/discover/discover-view.cards.tsx (9 bg-white-no-dark), not-found.tsx (2 text-gray-900-no-dark + bg-white), api-docs/page.tsx, EqualizerPanel.tsx (2), plus singletons in settings/{notification,rss-feed,api-key,local-preferences}-sections.tsx and pricing/page.tsx. NON-blockers to leave alone: the player chrome (ExpandedPlayer.tsx, global-player/index.tsx:166, EmojiReactionPicker.tsx, PlayerOptionsMenu.tsx) is ALREADY dark-only (uses bg-gray-800/900 as its BASE class, matching DESIGN.md's always-dark player) so it flips correctly with the alias; embeds (embed/[songId]/page.tsx:35,49,78, EmbedSongPlayer.tsx, EmbedPlaylistPlayer.tsx) are intentionally dual via a `?theme=` query param and are standalone external-embed surfaces — leave their explicit isDark logic. Fix the ~15 real in-app hazard files by adding dark: counterparts (or, preferably, migrating them straight to step-5 semantic tokens).

_Files:_ src/app/[locale]/discover/discover-view.cards.tsx`, src/app/not-found.tsx`, src/app/[locale]/api-docs/page.tsx`, src/components/EqualizerPanel.tsx`, src/app/[locale]/settings/notification-sections.tsx`

### [M] Introduce semantic surface tokens as the long-term layer, migrate on touch

End-state per task option (a): expose the (now-corrected) globals.css vars as Tailwind utilities in theme.extend.colors — surface:var(--surface), surface-raised, surface-hover, border-default:var(--border), text-primary/secondary/muted, input-bg, player-bg — so components can write `bg-surface-raised text-primary` instead of `bg-white dark:bg-gray-800 text-gray-900 dark:text-white`. This collapses the 2-class dark: pattern into one token and makes the eventual light polish a pure CSS-var flip. Migrate incrementally, highest-traffic first: AppShell.tsx (frames 100% of authed routes; 82 dark: usages, still legacy bg-white dark:bg-gray-900 at :138,:286,:402 + violet wordmark at :142,:292,:412 — pairs naturally with the Wave-A AppShell rebuild), then settings/billing/profile (the 3 densest dark: files at 110/92/84 usages). Do NOT do a wholesale rewrite; on-touch only, exactly like the mobile theme.ts spacing/radii adoption note (theme.ts:130).

_Files:_ tailwind.config.ts`, src/app/globals.css`, src/components/AppShell.tsx`

### [M] Establish packages/core as the single token source; regenerate mobile theme.ts from it

apps/mobile/src/theme/theme.ts (darkBase :39-56, lightBase :58-75) already holds the DESIGN.md oklch→sRGB hex conversion and is the de-facto source of truth, but the web cannot import it: pnpm-workspace.yaml intentionally excludes apps/mobile from the workspace so RN deps never enter the server lockfile. There IS a shared framework-agnostic module — packages/core, aliased as @sunoflow/core (tsconfig.json:31). Recommendation: lift the canonical palette (surface stack, text, status hues, magenta ramp, tinted-gray ramp) into packages/core/design-tokens.ts as plain hex/oklch constants; web's tailwind.config.ts imports it for the gray+magenta ramps and globals.css var values are generated/derived from it; and since mobile isn't a workspace member, add scripts/sync-mobile-tokens.mjs (mirroring existing scripts/*.mjs like bundle-size.mjs) that reads packages/core and rewrites apps/mobile/src/theme/theme.ts's darkBase/lightBase, with a CI check to fail on drift. This makes DESIGN.md → packages/core → {web vars+ramp, mobile theme.ts} a one-way generated pipeline.

_Files:_ packages/core/index.ts`, apps/mobile/src/theme/theme.ts`, tailwind.config.ts`, scripts/bundle-size.mjs`

### [S] Decide the light theme: ship dark-only-by-default, keep the toggle wired, defer light polish

DESIGN.md:182-183 declares light a deferred comfort fallback that 'follows mechanically.' A working toggle already exists (ThemeSection at settings/local-preferences-sections.tsx:390-409 offers light/dark/system via useTheme/setTheme). Recommendation: KEEP the toggle (removing it is pure churn and the light CSS-var block + light: reachability already exist) but make dark the unstored default (step 1) and treat light as best-effort — after step 2's lightness-preserving gray alias, light mode renders in tinted near-whites, imperfect but not broken. Do NOT invest in light-mode contrast/polish now. Optionally relabel 'Light' as '(beta)' or hide it until a dedicated light-audit pass, since the current light values are the ones being corrected in step 3. Rationale: dark-first is a default + tint change, not a light-theme deletion; the cheapest coherent ship keeps the mechanism and just changes which side is default.

_Files:_ src/app/[locale]/settings/local-preferences-sections.tsx`, src/components/ThemeProvider.tsx`

**Risks:**
- Steps 1+2+3+4 MUST ship in ONE build. A half-flip (default-dark without the coherence-gap fixes, or the tint alias without default-dark) produces the exact 'light pages under a dark shell' failure the brief warns against. Verify with `pnpm build` then a click-through of AppShell + discover + settings + not-found + an embed URL (?theme=light and default).
- The gray-ramp alias affects BOTH light and dark (gray-50/100 are the light-mode base; gray-800/900/950 are the dark base). It must be strictly lightness-preserving (only add magenta tint), or light mode inverts to near-black. Verify by toggling to Light after the change: bg-gray-50 must stay near-white.
- FOUC: the 5 inline no-flash scripts must be updated identically and atomically; a mismatch flashes light on first paint of public pages (s/u/p/songs). Grep `sunoflow_theme` to confirm all 5 sites changed.
- Contrast regression: retinted text-gray-400 (→text-secondary #aaa2a5) and text-gray-500 (→text-muted #686164) on tinted-near-black must still pass WCAG AA. .lighthouserc.js exists — run it, and spot-check muted text (DESIGN.md warns muted-on-dark fails contrast fast).
- Player chrome uses gray-900 as its BASE (light) class and is intentionally always-dark; after the alias gray-900→#151012 confirm the player is not too-dark-on-surface-deep (global-player sits over the #0f090c body). Adjust player tokens if the tonal step disappears.
- Embeds must retain their explicit `?theme=` behavior (embed/[songId]/page.tsx:35) and must NOT read the global sunoflow_theme default — verify a shared embed on an external light page still honors ?theme=light.
- packages/core is framework-agnostic and enters the server lockfile; when lifting tokens there, keep it pure TS constants with zero RN/react imports, or the mobile-exclusion invariant in pnpm-workspace.yaml breaks.
- The mobile theme.ts already ships the CORRECT tinted values; if the web gray ramp is hand-typed instead of generated from the same source, web and mobile will drift again (the exact problem step 6 prevents). Prefer landing step 6's shared source before hand-editing hex in two places.


## Wave A — Dark-First Flip Mechanics

Wave 0 already shipped the magenta bridge (tailwind.config.ts aliases every `violet-*` utility to the DESIGN.md magenta ramp) and wired Geist fonts, so all 1752 violet literals across 177 files already recolor at build time. That means Wave A's remaining route-by-route payload is NOT the violet classes — it is the three things the bridge cannot touch: (1) surface/neutral literals the magenta alias ignores — 389 `bg-white`, 644 `dark:bg-gray-900/800/950`, 1077 `border-gray-*` (globals.css still ships pure-white light surfaces + untinted dark grays instead of the tinted-near-black console); (2) 44 raw violet hexes concentrated in shared files (chart-config.ts palette, Confetti, 5 analytics chart components, waveform/EQ, OG image, icon.svg, offline.html, manifest.json); and (3) the icon system — 171 files import Heroicons and zero use Lucide, against DESIGN.md's Lucide-22px-stroke-1.5 spec. The correct order is shared-first: finish the semantic token layer, build a Heroicon→Lucide map (125 symbols), migrate AppShell + global player (frame 100% of authed screens; AppShell alone = 30 violet + 86 surface literals + 24 Heroicons + a 5-tab bottom nav that must drop to the 3 spec modes), then the central chart/confetti primitives, then the core-loop components (Browse/Generate/Edit/Player/Playlists per PRODUCT.md), then thin core-loop routes, then the long tail (discover/settings/analytics/admin), auth + 33 error boundaries, public/embed/landing surfaces, and finally the three static Wave-0 leftovers. Migrating shared components before routes collapses most per-route work because the route pages are thin wrappers.

### [M] A0 — Finish the token foundation: add DESIGN.md semantic tokens to globals.css + tailwind.config.ts, and fix the dark-first surfaces

Wave 0 wired the magenta bridge (tailwind.config.ts:12-24,38 aliases violet-*→magenta) and fonts (lines 40-43), and set --accent:#ef009c. But globals.css STILL ships the legacy neutral stack: light --surface/--card-bg/--input-bg = #ffffff (globals.css:10,30,34 — DESIGN.md line 188 bans pure white), and dark --background:#0a0a0a / --surface:#111827 (globals.css:40,44) are untinted grays, not the tinted-near-black console (DESIGN.md line 164 surface-deep oklch(15% 0.01 350) = #0f090c). No semantic surface/status tokens exist in tailwind.config.ts (only background/foreground/violet). ACTION: (1) In globals.css add the full DESIGN.md stack as CSS vars for both :root and .dark using the exact sRGB hex already converted in apps/mobile/src/theme/theme.ts:44-63 (bg #0f090c, surface #151012, surfaceAlt #20181c, surfaceHover #2a2125, border #2f262a, text #f5f0f2, textDim #aaa2a5, textFaint #686164, danger/success/warn pairs); light values from lightBase at theme.ts:65+. (2) In tailwind.config.ts theme.extend.colors add named semantic tokens (surface-deep, surface, surface-raised, surface-hover, border-strong, text-primary/secondary/muted, status-ready/generating/error/info, accent→var(--accent)) so on-touch migration can replace gray literals with `bg-surface-raised` etc. (3) Fix layout.tsx:142 body className `bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white` → semantic tokens. This unblocks every later batch; without it, swapping bg-white→bg-surface has no token to point at.

_Files:_ src/app/globals.css`, tailwind.config.ts`, src/app/[locale]/layout.tsx`, apps/mobile/src/theme/theme.ts`, DESIGN.md`

### [M] A1 — Build the Heroicons→Lucide migration shim + symbol map (blocks all icon work)

171 files import from @heroicons/react/24/outline; 0 files use lucide-react (grep confirmed). 125 distinct *Icon symbols are imported across src. DESIGN.md line 261 + 234 specify Lucide 22px stroke-1.5. Rather than hand-editing 171 files blind, first produce a single canonical Heroicon→Lucide name map (e.g. HomeIcon→Home, Cog6ToothIcon→Settings, MusicalNoteIcon→Music, QueueListIcon→ListMusic, SparklesIcon→Sparkles, ShieldCheckIcon→ShieldCheck, etc.) covering all 125 symbols, add lucide-react to package.json, and set a default size/stroke convention (a wrapper or eslint rule enforcing size 22 strokeWidth 1.5). Heroicons use className w-x h-x sizing; Lucide takes size/strokeWidth props — so each migration is a mechanical import swap + prop swap. Deliver the map as the reference every later batch consumes so icon swaps are lookup-not-decision.

_Files:_ package.json`, src/components/AppShell.tsx`, DESIGN.md`

### [L] A2 — Migrate the shared chrome (highest leverage: frames 100% of authed screens)

AppShell.tsx is the single most off-brand + highest-traffic surface: 30 violet-N literals, 86 bg-white/dark:bg-gray/border-gray/text-gray surface literals, 24 Heroicon imports (AppShell.tsx:9-38), violet-400 wordmark (lines 142,292,412), active-nav bg-violet-50 dark:bg-violet-900/20 (lines 168,222,236,316,355,369), and the 5-tab mobile bottom nav navItems.slice(0,5) (line 509) that renders Home/Library/Inspire/Generate/Templates instead of DESIGN.md's Browse/Generate/Edit. The global player (mounts ONLY inside AppShell at line 484 via dynamic import) frames every authed screen too: migrate global-player/{index,PlayerControls,PlayerOptionsMenu,FloatingPopups}.tsx (PlayerControls 12 violet, PlayerOptionsMenu 13). Also AdminShell.tsx, ModalShell.tsx, ShellSkeleton.tsx (shared wrappers). Swap gray/white surfaces→semantic tokens (bg-surface-deep sidebar, bg-surface header, border-border), Heroicons→Lucide via the A1 map, reduce bottom nav 5→3 modes + a 'more' slot. Payoff-per-line is highest in the codebase — upgrades all ~25 AppShell-wrapped routes at once.

_Files:_ src/components/AppShell.tsx`, src/components/global-player/index.tsx`, src/components/global-player/PlayerControls.tsx`, src/components/global-player/PlayerOptionsMenu.tsx`, src/components/global-player/FloatingPopups.tsx`, src/components/AdminShell.tsx`, src/components/ModalShell.tsx`, src/components/ShellSkeleton.tsx`

### [M] A3 — Fix central design primitives that recolor many surfaces from one file (raw-hex offenders)

44 raw violet hexes exist that the magenta bridge CANNOT reach (they are hex strings, not violet-* classes). The leverage points: src/lib/chart-config.ts is the shared chart palette — CHART_PIE_COLORS is a 10-stop violet ramp (#7c3aed…#f5f3ff), CHART_TOOLTIP_STYLE bg #1f2937, CHART_AXIS_TICK fill #9ca3af; it is imported by all 5 analytics chart components (StatsCharts, UserAnalyticsCharts, InsightsCharts, PlayAnalyticsCharts, AdminAnalyticsCharts). Recolor this ONE file to the magenta/status ramp and every chart recolors. BUT those 5 components ALSO carry inline hex (InsightsCharts 10, PlayAnalyticsCharts 8, StatsCharts 6, AdminAnalyticsCharts 6, UserAnalyticsCharts 2) that must be migrated per-file. Confetti.tsx:5 COLORS = [#7c3aed,#a855f7,#ec4899,…] (consumed by GenerateForm + NotificationContext). Also EqualizerPanel, PlayerWaveform, SectionEditor, TagInput, WaveformPlayer carry raw violet hex, and api/og/song/[songId]/route.tsx (OG image) + src/lib/tags/index.ts + src/lib/openapi-paths/tags.ts. Migrate shared UI atoms here too: Toast.tsx, Skeleton.tsx, FeatureGate.tsx (12 violet), UpgradeModal.tsx (10).

_Files:_ src/lib/chart-config.ts`, src/components/analytics/InsightsCharts.tsx`, src/components/analytics/PlayAnalyticsCharts.tsx`, src/components/analytics/StatsCharts.tsx`, src/components/analytics/AdminAnalyticsCharts.tsx`, src/components/analytics/UserAnalyticsCharts.tsx`, src/components/Confetti.tsx`, src/components/EqualizerPanel.tsx`, src/components/PlayerWaveform.tsx`, src/components/WaveformPlayer.tsx`, src/app/api/og/song/[songId]/route.tsx`

### [L] A4 — Migrate the core-loop shared components (Browse/Generate/Edit/Player/Playlists — the operator's loop per PRODUCT.md)

PRODUCT.md lines 14-18 define three equal modes: Browse, Generate, Edit, plus the player. Migrating these components collapses most per-route work because the routes are thin wrappers over them. BROWSE: SongsGalleryView (40 violet), SongListItem (28), PlaylistsView (26), LibraryView (15), LibraryToolbar (15), library/song-grid-card (14), LibraryFilterPanel (9), library/{batch-action-bar,swipable-song-row}. GENERATE: GenerateForm (38), generate-form/{TemplatePickerPanel 26, LyricsGeneratorPanel 22, SuggestionsPanel 18, PresetPickerPanel, AutoGeneratePanel, RateLimitPanel}, LyricsEditor (24), GenerationProgress (14), GenerationHistoryView (12), GenerationQueue, SectionEditor (13). EDIT: MashupStudio, mashup-studio/{TrackSelector 16, SongPickerModal}, StemsPlayer (13), SeparateVocalsModal (12), CoverArtModal (10). PLAYER: ExpandedPlayer (16), UpNextPanel. PLAYLISTS/DETAIL: playlist-detail/{CollaborativePanel 31, PlaylistCollaboratorsPanel 27, SharePanel 21, PlaylistSharePanel 21, PlaylistSongListItem 18, PlaylistHeader 17, ActivityFeed, BatchToolbar}, PlaylistDetailView, SwipeablePlaylistItem. SONG DETAIL: SongDetailView, song-detail/{SongVariationTree 15, SongRemixPanel 12, SongHeroSection, SongRatingPanel, SongExportPanel}, SongMetadataCard, SongActionsBar, SongCompareView (10). Per file: swap gray/white surfaces→semantic tokens, violet-N→accent tokens on-touch, Heroicons→Lucide.

_Files:_ src/components/SongsGalleryView.tsx`, src/components/GenerateForm.tsx`, src/components/generate-form/TemplatePickerPanel.tsx`, src/components/generate-form/LyricsGeneratorPanel.tsx`, src/components/LyricsEditor.tsx`, src/components/MashupStudio.tsx`, src/components/mashup-studio/TrackSelector.tsx`, src/components/ExpandedPlayer.tsx`, src/components/PlaylistsView.tsx`, src/components/playlist-detail/CollaborativePanel.tsx`, src/components/SongListItem.tsx`, src/components/LibraryView.tsx`

### [M] A5 — Migrate the core-loop route pages (thin, mostly delegate to A4 components)

After A4, these AppShell-wrapped route files carry little of their own violet (the work lives in components). Core-loop routes to sweep: library/page.tsx + library/[id]/page.tsx, generate/page.tsx, mashup/page.tsx (also the paywall decision — feature-gates.ts:18-19, separate Wave-B item), playlists/page.tsx + playlists/[id]/page.tsx + playlists/invite/[token]/page.tsx, favorites/page.tsx, history/page.tsx, generations/page.tsx, templates/page.tsx + style-templates/page.tsx (the 4-names consolidation is Wave B), personas/page.tsx. All wrap <AppShell> (confirmed grep). Each page is low-density; sweep remaining literals + verify semantic tokens render. Bundle as one batch since per-file diffs are small.

_Files:_ src/app/[locale]/library/page.tsx`, src/app/[locale]/generate/page.tsx`, src/app/[locale]/mashup/page.tsx`, src/app/[locale]/playlists/page.tsx`, src/app/[locale]/playlists/[id]/page.tsx`, src/app/[locale]/favorites/page.tsx`, src/app/[locale]/history/page.tsx`, src/app/[locale]/generations/page.tsx`, src/app/[locale]/templates/page.tsx`, src/app/[locale]/personas/page.tsx`

### [L] A6 — Migrate the long-tail authed routes (discover, settings, analytics, feed, admin)

Highest-density long-tail file is discover/discover-view.cards.tsx (70 violet — biggest single [locale] offender), plus DiscoverView (16), discover-view.components (16), collections/[id]/CollectionDetailView (14). NOTE discover/explore render DiscoverView directly (NOT AppShell) — confirm they still get chrome or wrap AppShell. SETTINGS cluster (own layout): api-key-sections (28), billing/page (25), settings/page (20), preferences-tab (16), profile-tab (13), account-info-sections (11), notification-sections (9), local-preferences-sections (9), rss-feed-sections (5). ANALYTICS/STATS: dashboard/analytics/page (17), analytics/page (14 + gradients), insights (8), stats (4+hex), dashboard/analytics/[songId]. SOCIAL/MISC: feed (16), inspire (11 + own layout), profile (18 + own layout), users/[id] (12), pricing (13 + gradients), compare, radio, api-docs (bg-gray-900/bg-white literals), notifications. ADMIN (lowest priority, operator-only, AdminShell already done in A2): 13 admin pages (users/[id] 10, invite-codes 9, moderation 7, metrics 6, analytics/mirror/page 3 each) + admin chart components. Batch admin last.

_Files:_ src/app/[locale]/discover/discover-view.cards.tsx`, src/app/[locale]/discover/DiscoverView.tsx`, src/app/[locale]/settings/api-key-sections.tsx`, src/app/[locale]/settings/billing/page.tsx`, src/app/[locale]/settings/page.tsx`, src/app/[locale]/dashboard/analytics/page.tsx`, src/app/[locale]/feed/page.tsx`, src/app/[locale]/profile/page.tsx`, src/app/[locale]/pricing/page.tsx`, src/app/[locale]/admin/users/[id]/page.tsx`

### [M] A7 — Migrate auth pages + the 33 error/not-found boundaries (mechanical batch)

AUTH (standalone shells, not AppShell — login/page.tsx:1 uses bg-gray-50 dark:bg-gray-950): login (10 violet), register (10), forgot-password (10), reset-password (10), verify-email (5). These render on unauthenticated first-impression surfaces so brand matters. ERROR BOUNDARIES: 30 error.tsx files (each ~2 violet + a Heroicon import) + src/app/error.tsx, src/app/[locale]/not-found.tsx (3 violet), src/app/not-found.tsx, plus global-error. These are near-identical boilerplate — migrate one, apply the same diff across all 33. Confirmed count: find src/app -name error.tsx = 30; +3 global/not-found.

_Files:_ src/app/[locale]/login/page.tsx`, src/app/[locale]/register/page.tsx`, src/app/[locale]/forgot-password/page.tsx`, src/app/[locale]/reset-password/page.tsx`, src/app/[locale]/verify-email/page.tsx`, src/app/[locale]/not-found.tsx`, src/app/error.tsx`, src/app/not-found.tsx`

### [L] A8 — Migrate public/embed/landing surfaces (unauthed, shareable, SEO-indexed)

These have their own shells (no AppShell) and are the app's public face. PublicSongView.tsx is the single highest-density public file: 54 violet + 6 gradient literals (bg-gradient/from-violet at PublicSongView gradients). PublicProfileView (23 violet + 2 gradient), PublicPlaylistView (19 + gradients), embed/[songId]/EmbedSongPlayer (7), embed/playlist/[slug]/EmbedPlaylistPlayer (5). songs/[songId]/page.tsx delegates to PublicSongView (imports it at line 5) so it needs no separate migration. LandingPage.tsx (32 violet + 2 gradient) is the [locale] root page.tsx and marketing OnboardingTourUI (22, 3 gradient) + UpgradeModal (2 gradient). DESIGN.md line 145 bans indigo-purple gradients + glassy violet cards — audit the from-violet/to-violet gradient stops here specifically (One-Spark rule: magenta is never a gradient stop per line 161).

_Files:_ src/app/s/[slug]/PublicSongView.tsx`, src/app/u/[username]/PublicProfileView.tsx`, src/app/p/[slug]/PublicPlaylistView.tsx`, src/app/embed/[songId]/EmbedSongPlayer.tsx`, src/app/embed/playlist/[slug]/EmbedPlaylistPlayer.tsx`, src/components/LandingPage.tsx`, src/components/OnboardingTourUI.tsx`

### [S] A9 — Fix the leftover Wave-0 static assets (not covered by Tailwind/CSS-var bridges)

These are static files the build-time bridge never touches. public/manifest.json:8 still ships theme_color #7c3aed (violet!) — Wave 0 only fixed layout.tsx:96 themeColor to #ef009c, leaving the PWA manifest inconsistent; also background_color #f9fafb (line 7, light) should become surface-deep #0f090c for dark-first install. public/offline.html carries #7c3aed (lines 31,39), #6d28d9 (line 47 button:hover), #f9fafb bg (line 11) — swap to magenta #ef009c + dark surface. public/icons/icon.svg is a violet gradient (#7c3aed, #4c1d95, #a78bfa, #ffffff ×9) — the app/install icon itself is off-brand; regenerate as magenta on tinted-near-black. Cheap, isolated, high-visibility (install/offline/home-screen).

_Files:_ public/manifest.json`, public/offline.html`, public/icons/icon.svg`

**Risks:**
- The magenta bridge already recolored violet-* to magenta in PROD, so violet literals are cosmetically fine already — the biggest risk is spending Wave-A effort re-touching violet classes instead of the surface/neutral literals (bg-white/dark:bg-gray/border-gray) that are the actual off-brand payload. Verify by grepping bg-white|dark:bg-gray-900 counts drop, not violet counts.
- purple-*/indigo-*/pink-* (122 occurrences) are deliberately NOT aliased (tailwind.config.ts:9-11 comment: they carry status/mood/compare meaning). Blindly bulk-replacing them to magenta would destroy the mood-color map, notification-type colors, and A/B compare distinction. Migrate these only with intent.
- A9 static assets (manifest.json, offline.html, icon.svg) are cached aggressively by the service worker/PWA — a theme_color/icon change may not surface until SW update + reinstall. Verify via a fresh install / DevTools Application panel, not just a reload.
- Chart migration has two layers: chart-config.ts recolors globally but the 5 analytics chart components ALSO carry inline hex (InsightsCharts 10, PlayAnalyticsCharts 8, etc.) — fixing only chart-config.ts leaves half the chart colors violet. Verify each chart renders with no residual violet in the rendered SVG.
- Lucide↔Heroicon are not 1:1 (some names differ, some have no exact match, sizing model differs: className w/h vs size/strokeWidth props). A wrong map entry silently renders the closest-but-wrong glyph. The 125-symbol map must be reviewed, and each swapped icon visually checked at 22px/stroke-1.5.
- discover/explore render DiscoverView directly rather than wrapping <AppShell> (grep confirmed no AppShell import) — confirm these routes still receive shell chrome/player, or they may render shell-less after migration. Check in the running app.
- Force-dynamic rendering + theme bootstrap script (layout.tsx:103,131-135) means dark-first must not cause FOUC; test the no-flash path when switching globals.css defaults to dark-first, especially for logged-out/public routes that may default to system theme.
- Public/embed/landing surfaces (A8) use gradients (from-violet/to-violet) that DESIGN.md line 161 explicitly bans as accent gradient stops — simply recoloring the stops to magenta still violates the One-Spark rule; these need redesign to flat surfaces, not a find-replace. Flag for design review, not mechanical swap.


## Wave C — Mobile Crash/Error Telemetry

The Expo app (SDK 56, New Arch, RN 0.85, React 19.2) ships with zero telemetry: apps/mobile/package.json has no @sentry/* dep and the one caught error is swallowed to console at _layout.tsx:74. The correct 2026 integration is @sentry/react-native (sentry-expo was deprecated at SDK 50); the latest 8.19.0 covers SDK 56 (validated by merged PR #6216) and satisfies the repo's peer deps. GlitchTip compatibility is a solved problem the web already proves — point the DSN at errors.yester.cloud, keep replay OFF (don't add mobileReplayIntegration), and additionally set enableAutoSessionTracking:false because GlitchTip rejects sessions. Recommended wiring: a SEPARATE `sunoflow-mobile` GlitchTip project (not the web's project id 2, to keep RN native crashes/sourcemaps/quota isolated), the @sentry/react-native/expo config plugin in app.json (forces a native rebuild — must ride the pending free-Apple-ID device pass), getSentryExpoConfig merged into the monorepo metro config, a src/lib/telemetry.ts seam mirroring the web's logServerError tag scheme (source/route/platform + promoted songId/playlistId), init + Sentry.wrap + an expo-router ErrorBoundary in _layout.tsx, and selective capture in the api/client seam. Sourcemaps upload without EAS via the Xcode bundle phase on `pnpm release` (Release build) using a GlitchTip auth token + sentry.properties, with SENTRY_DISABLE_AUTO_UPLOAD=true on dev builds. The three things to prove on-device: SDK-56/New-Arch stability, that both JS and native events land symbolicated, and that no session/replay envelopes are emitted.

### [S] Provision a SEPARATE GlitchTip project `sunoflow-mobile` (do NOT reuse sunoflow-prod / project id 2) + a mobile DSN and an upload auth token

Decision: reuse-vs-separate → SEPARATE. The web project (sunoflow-prod, id 2) receives Next.js server + browser envelopes; mixing React-Native native crashes, RN Hermes-bundle sourcemaps/debug-files, and mobile release-health into it would pollute the issue list, the debug-file namespace (RN main.jsbundle.map ≠ Next.js maps), and the alert rules. A dedicated project keeps the mobile issue inbox, sourcemaps, quota, and alert-rule tuning independent. Create it under the SAME GlitchTip org as project 2 via the `yesterday-cloud:glitchtip-mcp` skill (it explicitly 'creates/updates GlitchTip projects + DSNs' via the REST API with a user auth token) or the GlitchTip UI at errors.yester.cloud. Capture three values for later steps: (a) the new project's DSN `https://<key>@errors.yester.cloud/<newProjectId>`, (b) the org slug, (c) a GlitchTip auth token (Settings→Auth Tokens, scope: project releases/read-write) for sourcemap upload. Cross-reference the web's tag convention so the two projects stay queryable the same way (src/lib/error-logger/server.ts:23 promotes songId/sunoJobId/playlistId/stemId/feedId + source/route/userId).

_Files:_ .ytstack/IMPROVEMENT-WAVES-2026-07-18.md`, docs/sentry-alerting.md`

### [S] Add the `@sentry/react-native` dependency (NOT sentry-expo — deprecated) and the DSN env var

Package choice is settled: `sentry-expo` was deprecated at Expo SDK 50 (Jan 2024) and folded into `@sentry/react-native`; the correct 2026 package is `@sentry/react-native`. Latest is **8.19.0** (npm dist-tags latest=8.19.0; peerDeps expo>=49, react>=17, react-native>=0.65 — satisfied by this repo's expo ~56.0.8 / react 19.2.3 / react-native 0.85.3). SDK-56/RN-0.85 support was validated via getsentry/sentry-react-native PR #6216 (Expo sample bumped to SDK 56, merged 2026-05-27) which shipped before 8.19.0; note the umbrella compat issue #6212 still lists open sub-tasks, so treat New-Arch/Fabric behavior as 'smoke-test-required' (see Step 9). Install with `cd apps/mobile && npx expo install @sentry/react-native` (resolves the SDK-56-appropriate pin and writes it into dependencies; keep the existing 'versions pinned to SDK 56' comment at apps/mobile/package.json:48 accurate). DSN wiring mirrors the web's env-gated pattern (sentry.client.config.ts:12 gates on NEXT_PUBLIC_SENTRY_DSN): use `EXPO_PUBLIC_SENTRY_DSN` — Expo inlines EXPO_PUBLIC_* into the JS bundle exactly like NEXT_PUBLIC_* (the repo already uses this convention at apps/mobile/src/api/client.ts:10 for EXPO_PUBLIC_SUNOFLOW_BASE_URL). Init must no-op when the var is unset. Document the var in apps/mobile/README.md alongside EXPO_PUBLIC_SUNOFLOW_BASE_URL.

_Files:_ apps/mobile/package.json`, apps/mobile/README.md`, apps/mobile/src/api/client.ts`

### [S] Wire the `@sentry/react-native/expo` config plugin in app.json — this MANDATES a native rebuild; sequence it into the pending free-Apple-ID device pass

Add to the `plugins` array in apps/mobile/app.json:20-30 (after the existing expo-router/expo-secure-store/expo-audio/expo-video entries):
[
  "@sentry/react-native/expo",
  { "url": "https://errors.yester.cloud/", "project": "sunoflow-mobile", "organization": "<org-slug>", "note": "Use SENTRY_AUTH_TOKEN env to authenticate." }
]
This plugin edits the native iOS project: adds the RNSentry pod and injects sourcemap/debug-symbol upload into the Xcode 'Bundle React Native code and images' build phase. Therefore it is NOT a JS-only change — it requires `pnpm --filter sunoflow-mobile prebuild` (expo prebuild -p ios --clean, already scripted at package.json:11) followed by a fresh `expo run:ios`. CRITICAL sequencing flag: the repo builds via free-Apple-ID dev builds (`expo run:ios`, package.json:8-10) with no EAS, and a device pass is pending — this native rebuild MUST ride the same rebuild as the device pass (or be scheduled as its own), because free-provisioning profiles expire ~7 days and every telemetry-config change needs a re-pod-install + rebuild anyway. The `url` option is what re-points the Sentry CLI upload at self-hosted GlitchTip instead of sentry.io.

_Files:_ apps/mobile/app.json`

### [S] Merge `getSentryExpoConfig` into metro.config.js WITHOUT losing the monorepo core-link resolution

apps/mobile/metro.config.js currently builds from `getDefaultConfig(projectRoot)` and then sets `config.watchFolders=[coreDir]` and `config.resolver.nodeModulesPaths=[projectRoot/node_modules, repoRoot/node_modules]` so the `link:` @sunoflow/core dep and root-hoisted deps resolve. The Sentry sourcemap pipeline needs Metro wrapped by `getSentryExpoConfig` (from '@sentry/react-native/metro') INSTEAD of getDefaultConfig — otherwise sourcemaps aren't collected. Exact change: replace `const { getDefaultConfig } = require('expo/metro-config');` with `const { getSentryExpoConfig } = require('@sentry/react-native/metro');` and `const config = getDefaultConfig(projectRoot);` with `const config = getSentryExpoConfig(projectRoot);` — then KEEP the two existing lines that set watchFolders and resolver.nodeModulesPaths verbatim. getSentryExpoConfig returns the same Expo default config object (it wraps getDefaultConfig internally), so the monorepo overrides still apply.

_Files:_ apps/mobile/metro.config.js`

### [M] Create `apps/mobile/src/lib/telemetry.ts` — GlitchTip-safe Sentry.init + a captureError wrapper mirroring the web's logServerError tag scheme

New module, single seam (parallels the web's src/lib/error-logger/server.ts). initTelemetry(): early-return if `process.env.EXPO_PUBLIC_SENTRY_DSN` is falsy (env-gated like sentry.client.config.ts:14), else `Sentry.init({ dsn, environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? 'production', release: process.env.EXPO_PUBLIC_SENTRY_RELEASE, tracesSampleRate: 0.1, enableAutoSessionTracking: false, enableNativeCrashHandling: true })`. GlitchTip-critical flags (repo memory .ytstack/KNOWLEDGE.md:32 + docs/sentry-alerting.md:3): (1) enableAutoSessionTracking:false — GlitchTip rejects session/release-health envelopes (option renamed from autoSessionTracking in SDK v7; use enableAutoSessionTracking in v8); (2) do NOT add Sentry.mobileReplayIntegration() and do NOT set replaysSessionSampleRate/replaysOnErrorSampleRate — mobile replay is opt-in (off by default), and GlitchTip rejects Replay envelopes (matches the web's deliberate omission of replayIntegration). Default integrations give JS-error + native-crash (iOS) + unhandled-promise coverage automatically (ReactNativeErrorHandlers). Then export captureError(source, error, context) mirroring logServerError's shape (server.ts:43-104): set tags { source, route: context.route, platform: 'ios', ...(songId/playlistId/sunoJobId if in context.params) } and extra { params, correlationId }; keep the same INDEXED_PARAM_KEYS names (server.ts:23) so a GlitchTip `list_issues query:"source:mobile.library.play"` works across BOTH projects. Also export setTelemetryUser(id)/clearTelemetryUser() → Sentry.setUser({ id }) / Sentry.setUser(null), and a breadcrumb helper. Use kebab 'mobile.<area>.<action>' source names (mirrors web sources like 'queue-process'/'mcp.auth').

_Files:_ apps/mobile/src/lib/telemetry.ts`, apps/mobile/src/lib/share.ts`

### [M] Wire init + root ErrorBoundary + Sentry.wrap in app/_layout.tsx and kill the silent auth-check swallow

apps/mobile/app/_layout.tsx: (1) add `import * as Sentry from '@sentry/react-native'` and `import { initTelemetry, captureError } from '@/lib/telemetry'`; call `initTelemetry()` ONCE at module scope (top-level, before RootLayout — Sentry must init before first render). (2) Change the default export from `export default function RootLayout()` to a named `function RootLayout()` plus `export default Sentry.wrap(RootLayout)` — Sentry.wrap installs touch/navigation breadcrumbs and the native error hook. (3) Add expo-router's convention `export function ErrorBoundary({ error, retry }: ErrorBoundaryProps)` (import type from 'expo-router') that calls `captureError('mobile.root.render', error, { route: 'root' })` in a useEffect and renders a themed fallback (use theme.ts tokens: bg #0f090c, text, accent — 'Something went wrong' + a retry Pressable calling retry()). This catches render-phase JS crashes that Sentry.wrap's boundary would otherwise only report. (4) Replace the swallow at _layout.tsx:74 `.catch((e) => console.error('[auth] key check failed', e))` with `.catch((e) => captureError('mobile.auth.key-check', e, { route: 'root' }))`.

_Files:_ apps/mobile/app/_layout.tsx`, apps/mobile/src/theme/theme.ts`

### [M] Add API-client breadcrumbs + selective capture, set user on login/signout, and sweep the highest-value console.error swallows

apps/mobile/src/api/client.ts:20-25 is the single fetch seam — wrap it to (a) push a Sentry breadcrumb {category:'http', data:{method,path}} per request, and (b) route non-expected HttpError through captureError('mobile.api', err, { route: path }) ONLY for status >=500 or non-HttpError network throws; SKIP 401/403/404/429 (expected control-flow — mirrors the MCP-noise lesson at .ytstack/IMPROVEMENT-WAVES-2026-07-18.md:265 where routine auth/rate-limit rejects flooding GlitchTip is an anti-pattern). User identity: the login response (app/login.tsx:36 `{ key, id }`) returns the apiKey id, not userId — after `setSession` (login.tsx:35) fetch `/api/profile` (returns `{ id }`, src/api/profile.ts:14) and call setTelemetryUser(profile.id); also call it on cold-start in _layout.tsx after the key check; call clearTelemetryUser() at signout (settings.tsx:57 revoke path). Prioritize converting the 204 console.error swallow sites (grep count) that represent real failures over noise — highest value: play-on-tap failures (index.tsx:210 '[library] play failed'), generate submit, and login network error (login.tsx:39) → captureError with a 'mobile.<area>.<action>' source. Leave load-list catches that already surface an EmptyState as breadcrumbs-only.

_Files:_ apps/mobile/src/api/client.ts`, apps/mobile/app/login.tsx`, apps/mobile/app/(tabs)/(library,playlists,favorites,history,profile)/index.tsx`, apps/mobile/app/(tabs)/(library,playlists,favorites,history,profile)/settings.tsx`

### [M] Enable sourcemap + debug-symbol upload to GlitchTip on Release builds without EAS

With the config plugin (Step 3) + getSentryExpoConfig metro (Step 4), the existing `pnpm release` script (expo run:ios --configuration Release --device, package.json:9) auto-uploads the Hermes bundle sourcemaps + iOS dSYM via the injected Xcode 'Bundle React Native code and images' build phase — no EAS needed. Requirements at build time: `SENTRY_AUTH_TOKEN` (the GlitchTip token from Step 1) exported in the shell, plus a `sentry.properties` at apps/mobile/ios/sentry.properties with `defaults.url=https://errors.yester.cloud/`, `defaults.org=<org-slug>`, `defaults.project=sunoflow-mobile`, `auth.token=<token or ${SENTRY_AUTH_TOKEN}>` (the plugin generates this from its app.json config; verify it points at GlitchTip not sentry.io). For dev/debug builds (`pnpm ios` / `pnpm start`, package.json:7-8) prefix with `SENTRY_DISABLE_AUTO_UPLOAD=true` so local iteration doesn't attempt uploads. GlitchTip DOES accept sentry-cli release-file/sourcemap uploads (it added JS sourcemap support in 1.12), but its symbolication is newer than Sentry SaaS — treat JS unminification as verify-on-first-event (native crashes symbolicate independently from the dSYM regardless). Ensure ios/sentry.properties and any token are gitignored (apps/mobile/.gitignore).

_Files:_ apps/mobile/package.json`, apps/mobile/.gitignore`

### [S] Verification pass on a real device (Release build) — flag New-Arch smoke test explicitly

Because SDK-56 compat issue #6212 still lists open items, verify on device rather than assuming: (1) temporarily add a dev-only trigger (a button calling `Sentry.captureException(new Error('mobile-telemetry-smoke'))` and one calling `Sentry.nativeCrash()`), build with `pnpm release`, and confirm BOTH a JS event and a native crash arrive in the sunoflow-mobile GlitchTip project with tags source/route/platform present and (for JS) an unminified stack. (2) Confirm NO session/replay envelopes are sent (GlitchTip would 4xx them — check no ingest errors). (3) Confirm the root ErrorBoundary renders + reports by throwing in a screen. (4) Confirm New-Arch/Fabric app still boots normally with RNSentry pod linked (reanimated 4 + worklets 0.8.3 already in the native tree — watch for pod conflicts during prebuild). Remove the smoke triggers before shipping.

_Files:_ apps/mobile/app/_layout.tsx`, apps/mobile/app.json`

**Risks:**
- SDK-56 compatibility is not officially closed: getsentry/sentry-react-native issue #6212 still lists open sub-tasks even though the Expo-56 sample PR #6216 merged (2026-05-27) and 8.19.0 shipped after. Verify: build a Release binary on a real device and confirm both a JS captureException and a Sentry.nativeCrash() land in GlitchTip, and that the New-Arch/Fabric app boots with the RNSentry pod linked (watch for CocoaPods conflicts with reanimated 4 / worklets 0.8.3 during prebuild).
- Native rebuild is unavoidable: the @sentry/react-native/expo plugin mutates the iOS native project (RNSentry pod + Xcode bundle phase), so it needs `expo prebuild --clean` + `expo run:ios`. This must be sequenced INTO the pending free-Apple-ID device pass, not shipped as a JS-only change; free-provisioning profiles also expire ~7 days, so plan for repeated local rebuilds. Verify by checking the pod appears in ios/Podfile.lock after prebuild.
- GlitchTip sourcemap/symbolication support is newer and less complete than Sentry SaaS — JS stacks may arrive minified on the first release even when native crashes symbolicate fine. Verify with a deliberate test event on the first Release build; if JS stays minified, fall back to the manual `npx sentry-expo-upload-sourcemaps` path or accept native-only symbolication initially.
- EXPO_PUBLIC_SENTRY_DSN is inlined into the JS bundle at build time (same class of bug as the web's NEXT_PUBLIC_SENTRY_DSN Docker-ARG lesson, .ytstack/KNOWLEDGE.md:62) — changing the DSN requires a rebuild, and the value ships in the client bundle (acceptable: DSNs are public ingest keys). Verify the DSN is present in the built bundle, not just the shell env.
- Config-option drift between SDK majors: use `enableAutoSessionTracking: false` (the v7+ name) not the older `autoSessionTracking`; confirm against the installed 8.19.0 TypeScript types before building. Wrong/removed option names silently no-op and let GlitchTip-incompatible session envelopes through.
- Noise risk if capture is too broad: routing every API 401/403/429/404 through captureException would flood the mobile project exactly like the MCP-endpoint anti-pattern (waves doc line 265). Verify the client wrapper only captures >=500 / genuine network throws and downgrades expected auth/rate-limit statuses to breadcrumbs.


## Wave C — Ops Blueprints (FileCache eviction, cron run-history, migrate-drift, mobile CI)

I have everything I need across all four topics, including one gotcha I verified by actually running the mobile typecheck. Here are the four blueprints.

---

# Blueprint 1 — FileCache eviction + disk monitoring

## Current state (evidence)
`src/lib/cache/file.ts` is a factory (`createFileCache`, line 68) producing two singletons: `audioCache` (`.mp3`, line 200) and `imageCache` (`.jpg/.png/.webp`, line 207). The cache dir comes from `process.env[config.envVar]` or `cwd()` (line 69) — in prod these are the fixed Railway volumes `/data/audio-cache` and `/data/image-cache` (`railway.toml:13-14`). Files are stored flat, named `${safeName(id)}${ext}` where `id` is the song id (line 150).

There is **no size cap and no eviction anywhere**. `count()` (line 185) only counts files; nothing sums bytes. `put` (line 146) does a fire-and-forget `fsp.writeFile` (line 155). The volume grows monotonically until the disk fills, at which point `writeFile` starts throwing `ENOSPC` (silently swallowed into `logger.warn` at line 156) and every cache-miss serves uncached.

Grow sites (where eviction must be considered): `src/lib/audio/index.ts:153` (`put`) and `:59`; `src/lib/images/proxy.ts:49,67`; `src/lib/cache/warmup.ts:68,73,108,116`; `src/app/api/songs/[id]/refresh/route.ts:69,72`; `src/app/api/admin/backfill-images/route.ts:28`; `src/lib/generation/song-ready-events/cache-assets.ts:17,24,31,36`.
Hot read path: `src/lib/audio/index.ts:190` (`getStream`, byte-range) and `:178` (`getSize`); cold reads `src/lib/songs/download.ts:70` and `src/lib/images/proxy.ts:42` (`get`).

## Design
LRU-by-mtime eviction with an env-tunable byte cap, driven by a scheduled sweep plus an opportunistic post-write trigger.

1. **Config** — extend `FileCacheConfig` with `maxBytesEnvVar` and a `defaultMaxBytes`. Read the cap in `createFileCache`:
   - `audioCache`: `AUDIO_CACHE_MAX_BYTES` (suggest default `2_000_000_000` = 2 GB; ~5 MB/track ≈ 400 tracks).
   - `imageCache`: `IMAGE_CACHE_MAX_BYTES` (suggest default `500_000_000`).
   - `0`/unset-with-no-default ⇒ eviction disabled (dev/local).
2. **Stats accounting** — add `getStats(): { count: number; totalBytes: number }` that `readdirSync` + `statSync().size` sums over `config.extensions` (reuse the `count()` filter). This is the one full-dir scan; call it only from the sweep and `/api/health`, never per request.
3. **Eviction routine** — add internal `evictToCap()`:
   - `readdirSync` the cache dir, `statSync` each matching file to get `{path, size, mtimeMs}`.
   - If `Σsize ≤ cap` return `{ evicted: 0, freedBytes: 0 }`.
   - Sort ascending by `mtimeMs` (oldest first), `fs.unlinkSync` from the front until `Σsize ≤ cap * 0.9` (10% low-water hysteresis so it doesn't run every put).
   - **Skip any file with `mtimeMs > Date.now() - 60_000`** (min-age guard) so a file mid-download/mid-write is never a target.
   - Use `mtime`, not `atime` — Railway/ext4 volumes are commonly mounted `noatime`, so atime is unreliable for LRU.
4. **Trigger — both**:
   - *Scheduled*: register a `file-cache-eviction` job in `src/lib/jobs/job-definitions.ts` (cron e.g. `"15 * * * *"`) that calls `audioCache.evictToCap()` + `imageCache.evictToCap()` and `logger.info`s freed bytes/counts. This piggybacks the existing node-cron scheduler (`src/lib/scheduler.ts`) and appears in `/api/health` jobs automatically.
   - *Opportunistic*: after a successful `downloadAndPut` write (line 177) and in `put`'s write callback (after line 155 resolves), increment an in-memory `bytesWrittenSinceCheck` counter; when it crosses a threshold (e.g. 100 MB) fire `evictToCap()` once (guard with a boolean so concurrent puts don't stack). This bounds growth between sweeps under a burst.
5. **Disk-usage signal** — add a `cache: { audio: {count,bytes,maxBytes}, image: {...} }` block to `/api/health` (`src/app/api/health/route.ts`) sourced from `getStats()`, and mirror into `src/lib/metrics.ts` (add a `cache.bytes` gauge next to the existing hit/miss counters at line 74). This is the same "make it countable" pattern the waves doc asks for in the self-heal finding — one place the operator can watch fill rate.

## Mid-stream safety (the load-bearing detail)
`getStream` opens a `createReadStream` (file.ts:129) and returns immediately; the response body is consumed asynchronously afterward. On POSIX (Railway/Linux), `unlink` only removes the directory entry — the inode and its data persist until the last open fd closes. So **evicting a file that is currently being streamed is safe**: in-flight readers finish from the open fd; only *new* `findFile` lookups miss and trigger a re-download via `downloadAndPut`. The min-age guard (step 3) additionally protects the just-written file (newest mtime ⇒ never selected) and any partial in-progress download.

## Effort / risks / verification
**Effort: M.**
Risks: (a) the sweep's full-dir `statSync` loop is O(files) — fine at ~hundreds of files, but keep it off the request path (sweep + health only). (b) Setting the cap too low thrashes (evict → immediate re-download of a hot track); the 2 GB/500 MB defaults plus 10% hysteresis and warmup ordering by `playCount` (warmup.ts:31) mitigate this. (c) `evictToCap` must not run concurrently with itself — single boolean guard.
Verification: unit-test `evictToCap` against a temp dir (write N files with controlled mtimes via `fs.utimesSync`, assert oldest-first removal stops at low-water and respects min-age); assert an open `createReadStream` still reads full content after its backing file is unlinked; hit `/api/health` and confirm the `cache` block reports non-zero bytes after a warmup.

---

# Blueprint 2 — Cron run-history + job-health staleness

## Current state (evidence)
Two independent scheduling mechanisms exist, and they don't cover the same jobs.

**In-process node-cron scheduler** (`src/lib/scheduler.ts`): started once at boot from `src/instrumentation.ts:31-32` (`registerAllJobs()` → `startScheduler()`). Six jobs in `src/lib/jobs/job-definitions.ts:60-67`: `smart-playlist-refresh`, `email-digest-send`, `analytics-aggregation`, `session-cleanup`, `rate-limit-cleanup`, `retention-cleanup`. Run-history (`JobRunRecord`, scheduler.ts:26) lives **only in `globalThis`** (scheduler.ts:47) — every deploy/restart wipes it. `/api/health` reports these via `getSchedulerStatus()` (`src/app/api/health/route.ts:27`).

**HTTP cron routes** (`src/app/api/cron/*`): three routes — `feed-auto-generate`, `generate-embeddings`, `refresh-smart-playlists` — each wrapped in `cronRoute` (Bearer `CRON_SECRET` auth, `src/lib/route-handler/builders.ts:70-98`). **No trigger for them exists in the repo**: the only scheduled workflows are `ci.yml`, `db-backup.yml`, `uptime-monitor.yml`; `railway.toml` has no `[cron]`. `docs/incident-response.md:145` claims a "Railway cron trigger" but it's undocumented dashboard state.

**The gap**: only `refresh-smart-playlists` is double-covered (it equals the in-process `smart-playlist-refresh`). `feed-auto-generate` and `generate-embeddings` are **not** in `JOB_DEFINITIONS`, so if the dashboard trigger is missing or its `CRON_SECRET` drifts, RSS auto-generation and new-song embeddings silently stop, and `/api/health`'s `jobs` array (which reflects only in-process jobs) shows nothing wrong — even a manual health check can't tell you embeddings have been dead for a week.

## Design

### A. `JobRun` record (persistent history)
Add a Prisma model (schema conventions: `postgresql`, `cuid()` ids, `@@index` — see `AdminLog` at schema.prisma:368):
```prisma
model JobRun {
  id         String    @id @default(cuid())
  name       String
  startedAt  DateTime  @default(now())
  finishedAt DateTime?
  durationMs Int?
  status     String    // "running" | "ok" | "failed"
  counts     Json?     // e.g. { processed, success, fail } or { refreshed, skipped }
  error      String?
  createdAt  DateTime  @default(now())

  @@index([name, startedAt])
  @@index([status, startedAt])
}
```
Ship it as a normal timestamped migration (`prisma/migrations/<YYYYMMDDHHMMSS>_add_job_run/`) — the CI `migration safety check` (`ci.yml:67`) and naming regex in `scripts/check-migration-safety.sh:33` accept it. **Add a retention job** (or extend the existing `retention-cleanup` in `src/lib/jobs/retention-cleanup.ts`) to prune `JobRun` older than ~30 days, since the waves doc already flags append-only tables without retention.

### B. `withJobRun` wrapper (record start/end/status/counts)
Single seam used by both mechanisms:
```ts
// src/lib/jobs/job-run.ts
export async function withJobRun<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const run = await prisma.jobRun.create({ data: { name, status: "running" } });
  const started = Date.now();
  try {
    const result = await fn();
    await prisma.jobRun.update({ where: { id: run.id }, data: {
      status: "ok", finishedAt: new Date(), durationMs: Date.now() - started,
      counts: extractCounts(result) }});
    return result;
  } catch (err) {
    await prisma.jobRun.update({ where: { id: run.id }, data: {
      status: "failed", finishedAt: new Date(), durationMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err) }});
    throw err;
  }
}
```
- Wrap each `run` in `JOB_DEFINITIONS` (job-definitions.ts) — or wrap centrally in `scheduler.ts`'s `runJob` (scheduler.ts:175) so all in-process jobs get history for free.
- Wrap each cron route handler body (`src/app/api/cron/*/route.ts`) so HTTP-triggered runs also persist. The cron routes already return count objects (`{ processed, success, fail }`, generate-embeddings/route.ts:71; `{ refreshed, skipped }`) — feed those into `counts`.

### C. Close the dead-cron gap (pick one)
1. **Preferred**: register `feed-auto-generate` and `generate-embeddings` as in-process jobs in `JOB_DEFINITIONS` (extract the route bodies into `src/lib/rss/auto-generate.ts` — already exists — and a new `src/lib/embeddings` job fn). They then auto-run, appear in `/api/health`, and stop depending on undocumented Railway dashboard state. Keep the HTTP routes as manual-trigger backstops.
2. **Alternative**: add a GitHub Actions cron mirroring `uptime-monitor.yml` that `POST`s each endpoint with `Authorization: Bearer $CRON_SECRET` and fails loudly on non-200.

### D. `/api/health` staleness
Extend the `jobs` mapping (health/route.ts:27) to read the **latest `JobRun` per name** (`prisma.jobRun.findFirst` ordered by `startedAt desc`, or a single `groupBy`), and compute a `stale` boolean per job by comparing `startedAt` against an expected max-interval derived from each job's cron cadence (store an `expectedMaxAgeMs` alongside the cron in `JOB_DEFINITIONS`). Surface `{ name, lastRun, stale }`. Then the existing `uptime-monitor.yml` jq assertion (`uptime-monitor.yml:55`) can be extended — or a second scheduled check added — to alert when any job is `stale`.

## Effort / risks / verification
**Effort: M.**
Risks: (a) writing a `JobRun` row on every run of a frequent job (`analytics-aggregation` hourly) is negligible, but the retention prune is required or the table grows unbounded. (b) If you keep both an HTTP route and an in-process job for the same task, guard against double-runs (they operate on `generationStatus`-scoped batches so they're idempotent, but note it). (c) `/api/health` must not fail if `JobRun` query errors — wrap in the existing try/catch (health/route.ts:11).
Verification: run a job locally, assert a `JobRun` row transitions running→ok with a non-null `durationMs` and populated `counts`; force a throw and assert status=failed with `error`; hit `/api/health` and confirm `stale:true` appears when the latest `JobRun.startedAt` is older than the job's `expectedMaxAgeMs`.

---

# Blueprint 3 — Remove the migrate-drift boot hack

## The hack (quoted)
`docker-entrypoint.sh:70-93`, run on every prod boot before `migrate deploy`:
```sh
KNOWN_DRIFT_MIGRATION="20260322200000_add_missing_schema_objects"
echo "Resolving known drift migration (best-effort): $KNOWN_DRIFT_MIGRATION"
if su-exec nextjs:nodejs node node_modules/prisma/build/index.js migrate resolve --rolled-back "$KNOWN_DRIFT_MIGRATION" --schema=./prisma/schema.prisma; then
  echo "Drift migration resolved: $KNOWN_DRIFT_MIGRATION"
else
  echo "No rolled-back resolve applied for $KNOWN_DRIFT_MIGRATION (continuing)"
fi
```
It marks one specific migration as *rolled-back* on every boot, so the subsequent `migrate deploy` (line 82) always re-applies it.

## Why it exists (git history)
- The migration `20260322200000_add_missing_schema_objects` was originally **broken and non-idempotent**; prod hit Prisma **P3009** (failed-migration state, blocks all further `migrate deploy`).
- `64ffb2c6` (2026-03-23) added the `resolve --rolled-back` recovery step and rewrote the migration to be idempotent.
- `9736187c` (2026-04-17, closes SUNAA-262) **removed** it with the rationale: *"That migration uses idempotent SQL (IF NOT EXISTS) and 50+ subsequent migrations have run cleanly since. The resolve is now a no-op that adds startup noise and confuses future debugging."*
- `1b32f960` (8 weeks ago, PR #81 "add title update support", authored by *Orchestrator*) **re-added the exact same block**, bundled into an unrelated feature commit, with a new comment ("safe if the migration never failed on this environment… continue") — **no dedicated commit or ticket explaining the re-add.** That undocumented flip-flop is itself the smell.

The migration today is fully idempotent — `IF NOT EXISTS` on every `ALTER TABLE`/`CREATE TABLE`/`CREATE INDEX` and a guarded `DO $$ … pg_constraint …$$` block for the two FKs (`prisma/migrations/20260322200000_add_missing_schema_objects/migration.sql:1-46`). So on any DB where it is already recorded as applied, `migrate deploy` skips it. The hack forces prod to *rolled-back → re-apply* it on every deploy, permanently churning `_prisma_migrations` and — more importantly — normalizing "ignore whatever the migration table says," which will mask a *real* future migration failure.

## Clean fix
1. **One-time on prod DB** (the actual root cause is prod's `_prisma_migrations` state, not the image). Inspect it:
   ```sql
   SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
   FROM "_prisma_migrations"
   WHERE migration_name = '20260322200000_add_missing_schema_objects';
   ```
   If it is recorded applied with `finished_at` set and `rolled_back_at` null → nothing to do. If it's in a failed/rolled-back state, resolve it **once** to applied:
   ```sh
   prisma migrate resolve --applied 20260322200000_add_missing_schema_objects
   ```
   (Do this against prod via the Railway DB proxy noted in memory; wrap read-checks first, then the single resolve.)
2. **Remove the block** — delete `docker-entrypoint.sh:71-80` (the `KNOWN_DRIFT_MIGRATION` echo + `migrate resolve --rolled-back` if/else). Leave the normal `migrate deploy` + `MIGRATIONS_STRICT` handling (lines 82-93) intact. Grep the dev scripts too — the 2026-04-17 removal touched "docker-entrypoint.sh and the dev script", so confirm no sibling copy lingers.
3. **Add a CI drift check** and integrate into `scripts/check-migration-safety.sh` (already invoked at `ci.yml:68` and `deploy-production.yml:58`). Use Prisma's shadow-DB diff to detect schema-vs-migrations drift:
   ```sh
   prisma migrate diff \
     --from-migrations ./prisma/migrations \
     --to-schema-datamodel ./prisma/schema.prisma \
     --shadow-database-url "$SHADOW_DATABASE_URL" \
     --exit-code
   ```
   Exit code `2` = drift (schema has objects no migration produces, or vice-versa) → fail the check with a clear message ("schema.prisma and prisma/migrations have diverged — generate a migration").
   **Placement matters**: the drift check needs a real Postgres. Add it to `ci.yml`'s `qa` job (which already runs the `postgres:16-alpine` service, ci.yml:14-27, and applies `migrate deploy` at line 65 — put the diff right after). **Do not** put the DB-connecting diff in `deploy-production.yml`, because that job runs `check-migration-safety.sh` with a *dummy* `SUNOFLOW_DATABASE_URL` (`postgresql://dummy:dummy@localhost:5432/dummy`, deploy-production.yml:57) — gate the new diff behind a `[ -n "$SHADOW_DATABASE_URL" ]` check so the deploy path skips it and CI runs it.

## Effort / risks / verification
**Effort: M** (small code change; the weight is the one-time prod resolve + verifying prod boots clean without the hack).
Risks: (a) if step 1 is skipped and prod's migration table is actually in a bad state, removing the hack could reintroduce P3009 on the next boot — hence verify the table state *before* removing. `MIGRATIONS_STRICT=true` in prod (docker-entrypoint.sh:11) means a genuine failure now correctly refuses to start, which is the desired behavior. (b) The drift check will start failing legitimately if someone edits `schema.prisma` without generating a migration — that's the point, but flag it in the PR so it isn't mistaken for a false positive.
Verification: after the one-time resolve, deploy once and confirm the boot log shows `migrate deploy` reporting "No pending migrations" (not a re-apply of `20260322200000`); confirm a fresh CI run passes the new drift step; deliberately add a column to `schema.prisma` without a migration and confirm CI's drift step fails with exit 2.

---

# Blueprint 4 — Mobile CI job (tsc + lint now, Maestro deferred)

## Current state (evidence)
`apps/mobile` is a **standalone pnpm root**: `pnpm-workspace.yaml` is `packages: []` (deliberately not a member of the server workspace, to keep the RN tree out of the Docker image), with its own committed `apps/mobile/pnpm-lock.yaml`. `@sunoflow/core` is wired as `link:../../packages/core` (package.json:19) and resolved for Metro/tsc via `metro.config.js` + `tsconfig.json` paths. Scripts (package.json:12-13): `typecheck` = `tsc --noEmit`, `lint` = `expo lint`. `newArchEnabled: true` and `experiments.typedRoutes: true` (app.json:10,32). **There is no existing mobile CI job** — the only workflows are web (`ci.yml`, `db-backup.yml`, `deploy-production.yml`, `uptime-monitor.yml`).

## Two prerequisite fixes (verified, not optional)

### P1 — mobile `tsc` pulls in vitest-bound core tests → breaks on a standalone install
I ran `pnpm exec tsc --noEmit --listFiles` in `apps/mobile`: it compiles **33 `packages/core` files, including 16 `*.test.ts`** (the tsconfig `include` has `"../../packages/core/**/*.ts"`, tsconfig.json:10). Those test files `import { describe, it, expect } from "vitest"`, and vitest currently resolves only from the **repo-root** `node_modules` (`…/SunoFlow/node_modules/.pnpm/@vitest…`), which exists locally only because the full dev tree is installed. A CI job that runs `pnpm install --frozen-lockfile` **inside `apps/mobile` only** will not create repo-root `node_modules` → `tsc` fails with `Cannot find module 'vitest'` on all 16 files. (Locally `tsc` exits 0 purely because the root tree happens to be installed — a false green.)
**Fix**: add to `apps/mobile/tsconfig.json`:
```json
"exclude": ["../../packages/core/**/*.test.ts"]
```
The mobile typecheck should cover shipped core *source* (which it imports — `ReactionPicker.tsx`, `SongRow.tsx`, `playback/audio.ts`, `playback/peaks.ts`, `hooks/usePollingJob.ts`, `api/account.ts`, etc.), not core's Vitest suite (which the web CI's `pnpm test` already covers).

### P2 — `expo lint` has no committed config and eslint-config-expo isn't installed
There is no `eslint.config.*`/`.eslintrc*` in `apps/mobile` and `eslint-config-expo`/`eslint` are absent from `node_modules`. On first run in a **non-interactive** CI, `expo lint` tries to scaffold ESLint and prompt — which hangs/fails on a runner.
**Fix**: add `eslint` and `eslint-config-expo` to `apps/mobile` devDependencies and commit a flat `apps/mobile/eslint.config.js`:
```js
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
module.exports = defineConfig([expoConfig, { ignores: ["dist/*", ".expo/*", "ios/*", "android/*"] }]);
```
Regenerate `apps/mobile/pnpm-lock.yaml` in the same change (CI uses `--frozen-lockfile`).

### P3 — typedRoutes note (verify, low risk)
`typedRoutes: true` normally wants generated `.expo/types`. Empirically `tsc --noEmit` exits 0 without them because expo-router's `Href` degrades to `string` when the generated union is absent (the app uses `target as Href` casts per the navigation model). Treat this as "verify on first CI run"; if tsc errors on route types, add a pre-step (`pnpm expo customize tsconfig` or a lightweight `expo export` type-gen) before `tsc`.

## The workflow (add `.github/workflows/mobile-ci.yml`)
```yaml
name: Mobile CI
on:
  push:
    branches: [main]
    paths: ["apps/mobile/**", "packages/core/**", ".github/workflows/mobile-ci.yml"]
  pull_request:
    branches: [main]
    paths: ["apps/mobile/**", "packages/core/**", ".github/workflows/mobile-ci.yml"]
jobs:
  mobile-qa:
    name: Mobile QA (tsc + lint)
    runs-on: ubuntu-latest          # tsc + lint need no macOS/simulator
    defaults:
      run:
        working-directory: apps/mobile
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: apps/mobile/pnpm-lock.yaml
      - name: Install (standalone mobile root)
        run: pnpm install --frozen-lockfile
      - name: Type check
        run: pnpm typecheck        # tsc --noEmit
      - name: Lint
        run: pnpm lint             # expo lint
```
Notes: `working-directory: apps/mobile` keeps the install standalone (no repo-root install — that's the whole point of the isolated lockfile, and P1 makes tsc self-contained). `cache-dependency-path` pins the pnpm cache to the mobile lockfile. `packages/core/**` is in `paths` because mobile tsc typechecks core source. **Expected duration ~2-4 min** (cold install of the RN dep tree dominates; the mobile `node_modules` is ~780 MB locally but CI installs from the lockfile with a warm pnpm store cache).

## Maestro — honest assessment
Flows **do exist**: `apps/mobile/.maestro/{smoke,background-audio,playlist}.yaml` (+ a thorough README). `smoke.yaml` is login→library→search→play→assert player; `playlist.yaml` exercises a real write path.

Can they run headless on GitHub runners? **Not cheaply, and not on every PR.** They drive the *real* app build against the *real* backend with **no network mocking** (README "Limitations"), which requires all of:
- A **booted iOS simulator** → GitHub **macOS runners only** (Linux can't run the iOS Simulator). macOS runner minutes bill at ~10× Linux.
- An **installed `.app`** → an Expo prebuild + `xcodebuild` (~15-30 min in CI) or an EAS build artifact. There is no committed native `/ios` (it's gitignored, regenerated by `expo prebuild`), so CI would build from scratch each run.
- **Real test-account credentials + a reachable backend + ≥1 existing song** in that account (flows read/play, they don't generate).
- The headline **M004 lock-audio proof (10-min screen-lock background playback) is explicitly not automatable** — the README states it must be done by hand on-device; a green Maestro run does not substitute.

**Recommendation**: ship the ubuntu **tsc + lint** job now (with P1/P2 fixed). Add Maestro **later** as a separate, **manually/nightly-triggered** macOS job (or via Maestro Cloud) once there's a stable EAS build pipeline + a dedicated test account — not as a per-PR gate. A tsc+lint-only gate today is the honest, high-value first step; it catches the class of breakage (type/lint) that a standalone-lockfile app with "UNTESTED scaffold" in its own package.json (package.json:48) is most exposed to.

## Effort / risks / verification
**Effort: S** for the workflow + P1 + P2 (Maestro job = **L, deferred**).
Risks: P1 is the one that will bite — without the tsconfig exclude the job goes red on day one for a reason that looks unrelated (vitest). P3 could surface typed-route errors on the first real standalone run.
Verification (do this before trusting the job): simulate the CI condition locally — from a clean checkout, install **only** `apps/mobile` (in a context without repo-root `node_modules`) and run `pnpm typecheck` + `pnpm lint`; both must pass. That reproduces exactly what the runner does and is the only way to confirm P1/P2/P3 are actually resolved rather than masked by the local full-tree install.

---

All findings are read-only and evidence-backed; the one thing I executed was `tsc --noEmit --listFiles` in `apps/mobile` (a typecheck, no writes) to confirm the vitest/standalone-CI gotcha in blueprint 4. Key evidence files: `src/lib/cache/file.ts`, `src/lib/scheduler.ts` + `src/lib/jobs/job-definitions.ts` + `src/app/api/cron/*` + `src/app/api/health/route.ts`, `docker-entrypoint.sh:70-93` + `scripts/check-migration-safety.sh` + `ci.yml`, and `apps/mobile/{package.json,tsconfig.json,app.json,.maestro/}`.
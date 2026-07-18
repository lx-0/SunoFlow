# Visual verification harness

Full-surface screenshot runs against a local **prod** build with a throwaway
DB and the keyless mock-generate path. Built for the Wave-A recolor: capture a
baseline before, re-run per migration batch, eyeball the informational diff.

**Not part of CI or the normal E2E suite.** The spec is `journey.visual.ts`
(not `*.spec.ts`), collected only by `playwright.visual.config.ts`
(`pnpm test:e2e` never sees it).

## The loop

```bash
# 1. BEFORE Wave A — capture + commit the baseline (small PNGs, committed on purpose)
VISUAL_LABEL=baseline bash scripts/visual-journey.sh
mkdir -p e2e/visual/__baseline__
cp -R visual-artifacts/baseline/. e2e/visual/__baseline__/

# 2. PER Wave-A batch — capture the "after" set
bash scripts/visual-journey.sh                      # writes visual-artifacts/current/

# 3. Diff (informational, always exits 0 — Wave A recolors everything by design)
node scripts/visual-diff.mjs                        # baseline vs visual-artifacts/current
#   → summary table + red-on-grayscale heatmaps in visual-artifacts/diff/

# 4. After a batch lands and looks right — promote current to the new baseline
cp -R visual-artifacts/current/. e2e/visual/__baseline__/

# Variants
SEED_MODE=rich bash scripts/visual-journey.sh       # varied titles/lyrics via Prisma seed
SKIP_BUILD=true bash scripts/visual-journey.sh      # reuse .next (must be a PLAYWRIGHT_TEST build)
KEEP_DB=true bash scripts/visual-journey.sh         # keep the sf-visual-db container
```

Output: `visual-artifacts/<label>/{visual-desktop,visual-mobile}/NN-surface.png`
(~21 shots per project: login/register, home, library + song detail, generate,
mashup lock, inspire, templates, style-templates, personas, playlists + detail,
favorites, history, discover, settings + billing, profile, pricing, player bar).
`visual-artifacts/` is untracked (the wrapper drops a `.gitignore` inside);
only `e2e/visual/__baseline__/` is committed.

## What the wrapper does (scripts/visual-journey.sh)

1. Throwaway Postgres 16 in Docker on `localhost:5433` (user `projects`, matches
   `.env.example` — deliberately NOT the compose db on 5432) + `prisma migrate deploy`.
2. `pnpm build` with `PLAYWRIGHT_TEST=true` (disables standalone output so
   `next start` works) and `SUNOAPI_KEY=""`.
3. `next start -p 80 -H 0.0.0.0` — the ONLY reliable local prod-run: any other
   port triggers the middleware port-strip self-redirect, and `next dev` dies
   with EMFILE (see `.ytstack/KNOWLEDGE.md`). macOS allows the unprivileged
   `:80` bind on `0.0.0.0`; on Linux you need `sudo`/`cap_net_bind_service`.
   `PLAYWRIGHT_TEST=true` on the server enables `/api/test/login` and skips the
   register rate-limit + invite gate; `SUNOAPI_KEY=""` keeps `/api/generate` on
   the keyless mock branch (exported empty so a real key in `.env` can't leak in).
4. Deletes stale `e2e/.shared-user.json`, then runs
   `playwright test --config=playwright.visual.config.ts` with
   `PLAYWRIGHT_REMOTE=true BASE_URL=http://127.0.0.1` (externally-managed server).

The journey spec self-registers its own user, seeds ~15 instantly-"ready" mock
songs via `POST /api/generate` (real Song rows, SVG data-URL covers, zero paid
calls — aborts loudly if a song ever comes back non-`ready`, i.e. a real Suno
key is present), creates 2 playlists + favorites via API, pins the dark theme,
and walks every surface in both viewports.

## Known caveats

- **All seeded titles read "Neon Drift"** in default mode — `/api/generate`
  always stores `mockSongs[0]`'s title/tags (core.ts mock precedence). Covers
  still vary (generated from the request metadata). For distinct
  titles/genres/lyrics run `SEED_MODE=rich` (`scripts/seed-visual-library.ts`).
- **No real playback**: mock songs have an empty `audioUrl`, so the player
  surfaces render their idle state — the "playing" visuals of the
  ExpandedPlayer can't be captured this way.
- **Mashup shows the free-tier lock** — that lock state is itself a surface
  under review, not a bug in the run.
- **Do not wire `toHaveScreenshot`/the diff as a CI gate** — Wave A changes
  ~1752 color literals; every surface diffs heavily by design. The diff script
  always exits 0.
- Seeded covers are `data:` URLs — if a future CSP tightening drops
  `img-src data:`, covers go blank; check the baseline PNGs before trusting a run.

---
kind: handoff
event: user-triggered
timestamp: 2026-07-20T10:10:28Z
project: SunoFlow
branch: main
current_milestone: M004
active_slice: S02
active_task: none
---

# Session Handoff

Written via `/wrapup` (`ytstack:handoff-session`) at 2026-07-20T10:10:28Z. Long autonomous session: Wave A web-brand migration + Archive fix + a full 6-dimension codebase audit.

## Position

- Project: **SunoFlow**
- Branch: `main`
- Milestone / Slice / Task: `M004` / `S02` / `none`
- Package version `0.4.0`; all this session's work accumulates under CHANGELOG `[Unreleased]`.

## In-flight work

**Nothing is mid-edit — the working tree is clean.** Everything shipped as 11 commits on `main`, all test-gated (tsc + `pnpm build` + vitest **1932 passing**) and deployed to Railway. The only thing still moving is a background CI/deploy watch for the audit head `3fe36a1f` (task `b4r4fm6mf`) — CI + Railway + `/api/health` confirmation.

Session commits (newest first): `3fe36a1f` C1 ratings · `766a22a7` Group-C · `86b31aa4` Group-B · `7ada2465` cleanup · `85bcba28` Wave-A batch 3 · `b1628b45` Wave-A9 · `da464953` archive · `97aa8f60` Wave-A batch 2 · `78385462` CI fix.

## Next action

The audit's actionable scope is **done**. Pick up with any of the deferred items (each needs an operator decision or a device pass — none is "just continue"):

- **A8 public/embed/landing brand migration** — the last authed→public Wave-A batch. NOT mechanical: the indigo-violet gradients need a flat-surface redesign (One-Spark). Decide the redesign direction first.
- **C7** — generate a shared brand-token module from `.impeccable/design.json` so web (`globals.css`/`tailwind.config.ts`) and mobile (`theme.ts`) can't drift.
- **C2** — un-`fixme` the playlist e2e (`e2e/playlists.spec.ts:159`): needs the local `E2E_SEED_SONGS` picker-never-renders repro (the Wave-0 residue).
- **Mobile Archive-tile nav** — route the mobile Smart-Playlists "Archive" tile to the mobile library archive view (data is already correct); needs on-device verification.
- **The 5 long-standing product decisions** below.

## Open decisions blocking progress

1. **Mashup paywall** (`minTier: 'starter'`) contradicts PRODUCT.md's three-equal-modes.
2. **Song-tap → full player** (today) vs. mini-player only (Spotify pattern).
3. **4 permanently dead cover URLs** — regenerate (credits) vs. NULL/placeholder.
4. **Prod hygiene** — 18 E2E test songs + 1 stuck-pending April row (delete/archive only on explicit go).
5. **Light theme fate** — recommendation: ship dark-only-by-default, keep the toggle wired, polish light later.
6. **A8 gradient redesign** + **C7 token-module architecture** (see Next action).

## Warnings / gotchas

- **Visual harness:** run `VISUAL_LABEL=<x> SEED_MODE=rich VISUAL_DB_PORT=5434 bash scripts/visual-journey.sh`. Default (API-seed) mode 429s on the 5-songs/hr generation quota; port 5433 is often taken.
- **Never put backticks in `git commit -m`** (zsh command-substitution mangles the message; a pushed message can't be fixed without force-push, which is forbidden).
- **`node:` builtins in edge:** if a lib reachable from the jobs graph imports `node:*`, `pnpm build` (not tsc) breaks with `UnhandledSchemeError` — IgnorePlugin it in the `nextRuntime === "edge"` webpack block (see `next.config.mjs`, KNOWLEDGE 2026-07-20).
- **`/api/health` public payload is consumed by the deploy pipeline** — keep the top-level `status` public (the security fix already does).
- **Mobile CI only triggers on `apps/mobile/**` / `packages/core/**`** — a web-only push watches CI alone; a `packages/core` change watches CI + Mobile CI.
- Audit workflow scripts (re-runnable) are in the session scratchpad: `codebase-audit.workflow.mjs`, `group-b-fixes.workflow.mjs`, `group-c-fixes.workflow.mjs`.

## How to resume

1. Start a new Claude Code session in this project directory.
2. SessionStart hook injects `STATE.md` — read the 2026-07-20 audit paragraph + the Next-action block.
3. Read this file for in-flight context.
4. Run `/ytstack:resume-session` for a synthesized briefing.
5. Execute one of the "Next action" items (each is gated on a decision above).

## Related artifacts

- Dashboard: `.ytstack/STATE.md` · Decisions: `.ytstack/DECISIONS.md` (2026-07-20 rating + Wave-A entries)
- Learnings: `.ytstack/KNOWLEDGE.md` (2026-07-20 audit section) · Wave plan: `.ytstack/WAVE-A-C-EXECUTION-PLAN-2026-07-18.md`
- Changelog: `CHANGELOG.md` `[Unreleased]`

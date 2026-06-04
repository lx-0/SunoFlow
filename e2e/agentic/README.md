# Agentic UX smoke test (LLM-driven synthetic users)

A **prototype**: an LLM persona drives the *real* SunoFlow UI, decides each step
itself from the page's accessibility tree, and records UX friction. It is **not**
a replacement for the scripted specs in `e2e/` and **not** a taste oracle — see
"What this is / isn't" below.

## The loop

```
        ┌──────────── OBSERVE ────────────┐
        │  page.locator('body')           │
        │     .ariaSnapshot()             │   ← same view Playwright-MCP gives an LLM
        └────────────────┬────────────────┘
                         ▼
        ┌──────────── DECIDE ─────────────┐
        │  LLM persona → one JSON action  │   ← persona.ts conditions behaviour
        │  click | fill | goto | note |   │      llm.ts = pluggable OpenAI-compatible
        │  done                           │
        └────────────────┬────────────────┘
                         ▼
        ┌──────────── ACT ────────────────┐
        │  getByRole(role, {name}).click  │   ← SunoFlow has no data-testid, so we
        │  failure is fed back to the LLM │      drive by role + accessible name
        └────────────────┬────────────────┘
                         ▼            repeat ≤ persona.maxSteps
                  AgentReport (steps + friction notes)
```

| File | Role |
|------|------|
| `persona.ts` | Persona definitions + research caveats |
| `llm.ts` | OpenAI-compatible `/chat/completions` call → structured `AgentAction` |
| `harness.ts` | `observe` / `act` / `runAgent` loop + markdown report |
| `sunoflow.agentic.spec.ts` | Wires login bypass + Suno/credits mocks, runs each persona |

## How it docks onto the existing setup

- **Auth:** reuses `loginViaUI` + the `/api/test/login` `PLAYWRIGHT_TEST` bypass.
- **No paid generations:** mocks `/api/credits`, `/api/songs`, `/api/generate`
  (via the existing `helpers.ts` mockers) — a bot run never hits Suno.
- **Selectors:** none invented — drives by the same `getByRole` accessible names
  the scripted specs use.

## Run it

```bash
# terminal 1 — PLAYWRIGHT_TEST dev server (port 3200)
pnpm dev

# terminal 2 — point at any OpenAI-compatible LLM
LLM_BASE_URL=http://192.168.2.42:11434/v1 LLM_MODEL=phi4:14b \
  pnpm exec playwright test e2e/agentic --headed
```

Reports land in `test-results/agentic/<persona>.md` and as Playwright attachments.

Env knobs (all optional, defaults → on-network Ollama):
`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`. Gateway alternative:
`LLM_BASE_URL=https://llm.yester.cloud/v1 LLM_API_KEY=<virtual-key> LLM_MODEL=default`.

The test **skips cleanly** (does not fail) if no LLM endpoint is reachable.

## What this is / isn't  (grounded in 2024–2026 research)

- ✅ **Is:** a cheap, repeatable pre-screen for *navigation / flow* defects —
  dead ends, confusing labels, missing affordances, broken multi-step flows.
- ❌ **Isn't:** evidence about what users *prefer* or whether they'd *like* a
  song/feature. Out-of-the-box LLM personas predict the next real human action
  at ~12% accuracy (arXiv:2503.20749) and flatten/misportray identity groups
  (arXiv:2402.01908, CHI 2024). Every friction note is a **hypothesis to confirm
  with a real user**, never a verdict. The build is *not* gated on UX outcome,
  only on the harness running.

## Status

Typechecks clean against the repo (`pnpm typecheck`, 0 errors). **Runtime
behaviour is unverified** — it needs a running `PLAYWRIGHT_TEST` dev server
(with DB) and a reachable LLM endpoint, neither available in CI-less/headless
contexts. First real run is the verification step.

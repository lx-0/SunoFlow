---
milestone: M003
project: SunoFlow
size: L
created: 2026-05-28T09:30:43Z
status: done
total_slices: 5
completed_slices: 4
cancelled_slices: 1
---

# M003 Roadmap

**Goal:** Ein User installiert das sunoflow-Plugin und kann mit einer einzigen Env-Var (`SUNOFLOW_API_KEY`) den MCP-Server nutzen, weil dieser remote auf `https://sunoflow.app/api/mcp` gehostet wird (Streamable-HTTP) und das Plugin nur die `.mcp.json` shippt. `.mcp.json` + Plugin-Version-Bump in beiden Yesterday-Marketplaces gelandet UND Smoke-Test von einer Fresh-Install-Maschine bestanden.

**Exit criteria:** see `M003-CONTEXT.md` (9 punkte).

## Slices

Slice detail lives in per-slice `M003-S##-PLAN.md` files, created by `ytstack:slice-milestone`.

- [x] S01 -- Spike: `/api/mcp` Route mit `sunoflow_info` only, Streamable-HTTP-Transport verdrahtet, MCP Inspector verifiziert E2E (4 tasks)
- [x] S02 -- Tools + Resources Port: alle 15 Tools + 4 Resource-Providers auf der HTTP-Route, shared registry, existierende Handler wiederverwendet (5 tasks)
- [x] S03 -- Security-Härtung: Origin-Header-Allowlist, Per-User-Rate-Limit, Per-Tool-Sentry/GlitchTip-Logging (4 tasks)
- [x] S04 -- Plugin-Ship: `.mcp.json` ins Plugin, 0.2.2→0.3.0, beide Marketplaces, stdio deprecated, Fresh-Install-Smoke-Test (5 tasks)
- [~] S05 -- OAuth 2.0 Path (CANCELLED 2026-06-02, see M003-S05-PLAN.md): `.well-known/oauth-protected-resource` + Auth-Server-Metadata, PKCE-Flow, alternative zu Bearer-Token (4 tasks)

## Run order

Slices execute sequentially. S01 → S02 → S03 → S04 → S05. Nach S04 ist das User-Versprechen (Plugin-Install + Env-Var → funktioniert) eingelöst; S05 ist OAuth-Ausbau. Nach jedem Slice `ytstack:reassess-roadmap` ausführen.

## How to update this file

- Flip slice checkbox `[ ]` → `[x]` when its tasks are all `summarize-task`-confirmed
- Update `completed_slices` count
- On milestone completion, flip `status: planned` → `status: done`

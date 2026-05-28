---
milestone: M003
project: SunoFlow
created: 2026-05-28T09:30:43Z
size: L
---

# M003 -- Context

## Goal

Ein User installiert das sunoflow-Plugin und kann mit einer einzigen Env-Var (`SUNOFLOW_API_KEY`) den MCP-Server nutzen, weil dieser remote auf `https://sunoflow.app/api/mcp` gehostet wird (Streamable-HTTP MCP-Transport, Spec 2025-06-18) und das Plugin nur die `.mcp.json` shippt. Zusätzlich: `.mcp.json` + Plugin-Version-Bump in beiden Yesterday-Marketplaces (lx-0 + yesterday-public) gelandet UND Smoke-Test von einer Fresh-Install-Maschine bestanden.

## Background

Heute (Stand 0.2.2) shippt das `sunoflow`-Plugin nur das Skill (`skills/sunoflow/SKILL.md`). Der MCP-Server in `mcp/server.ts` läuft als stdio-Subprocess und importiert direkt `@/lib/prisma`, `@/lib/sunoapi`, `@/lib/credits` etc. Das bedeutet:

- User braucht heute den geklonten Repo + `DATABASE_URL` + `tsx mcp/server.ts`, damit der MCP-Server startet -- das ist NICHT was `/plugin install sunoflow` ermöglicht.
- Plugin-Loader installiert keine `node_modules`, daher funktioniert ein roher `tsx mcp/server.ts`-Aufruf gegen das gecachte Plugin-Verzeichnis nicht out-of-the-box.
- Spec-Recherche (modelcontextprotocol.io/docs/concepts/transports + code.claude.com/docs/en/mcp, beide am 2026-05-28 abgerufen) bestätigt: Streamable HTTP ist der empfohlene Transport für Remote-MCP, SSE separat ist deprecated, Plugins können `.mcp.json` mit `{type: "http", url, headers}` und `${ENV_VAR}` / `${VAR:-default}` Interpolation shippen.

Die existierende Prisma-Kopplung wird damit zum Feature: SunoFlow hosted den MCP-Server selbst (Next.js API-Route), Tool-Handler bleiben nahezu identisch wiederverwendbar, User bringt nur den API-Key mit.

## Exit criteria

1. `POST https://sunoflow.app/api/mcp` mit `Authorization: Bearer sk-...` initialisiert eine MCP-Session und listet ≥15 Tools + ≥4 Resources.
2. MCP Inspector kann `generate_song` E2E ausführen und gibt eine `songId` zurück.
3. Stdio-Server (`mcp/server.ts`) ist entfernt oder als deprecated markiert; existierende Tool-Handler werden weiterverwendet (Code-Reuse statt Rewrite).
4. `.mcp.json` im Plugin shippt `{type: "http", url: "${SUNOFLOW_BASE_URL:-https://sunoflow.app}/api/mcp", headers: {Authorization: "Bearer ${SUNOFLOW_API_KEY}"}}`; `.claude-plugin/plugin.json` version bumped.
5. Plugin in lx-0- + yesterday-public-Marketplaces gelandet, `/plugin update sunoflow` zeigt neue Version.
6. Fresh-Install-Smoke-Test auf zweiter Maschine: `/plugin install sunoflow` + `export SUNOFLOW_API_KEY=...` → `/mcp` listet sunoflow als `connected`, `sunoflow_info` call returnt server version.
7. OAuth-2.0-Pfad alternativ zu Bearer-Token implementiert (RFC 9728 Protected Resource Metadata + RFC 8414 Auth Server Metadata, optional Dynamic Client Registration).
8. Rate-Limiting + Per-Tool-Sentry-Logging für `/api/mcp` (GlitchTip-Events bei API-Key-Misuse, Tool-Errors, Throttling).
9. Origin-Header-Validation gegen DNS-Rebinding (Spec MUST: validate Origin auf allen incoming connections; bei lokalem Dev nur an 127.0.0.1 binden).

## Size

**L** -- 4-5 Slices, 11-20 Tasks. Siehe `M003-ROADMAP.md` für Slice-Breakdown.

## Decisions locked in discuss phase

- 2026-05-28: M003 wird neues `current_milestone`, M002 (Generate-Refactor) pausiert mit S01 done / S02-S04 offen. Wieder aufgenommen nach M003-Done. Reason: MCP-Distribution ist Blocker für jeden öffentlichen Plugin-Use, GenerateForm-Refactor ist BAU-priorisierbar.
- 2026-05-28: Transport ist **Streamable HTTP** (MCP Spec 2025-06-18), nicht HTTP+SSE (deprecated). Single endpoint `/api/mcp`, akzeptiert POST + GET, optional SSE-Upgrade vom Server für Streaming.
- 2026-05-28: Auth primary path = Bearer-API-Key im `Authorization`-Header. OAuth ist additional path für Exit-Kriterium 7, nicht Ersatz. SunoFlow's existierende `ApiKey`-Tabelle bleibt Source of Truth.
- 2026-05-28: `mcp/server.ts` (stdio) wird NICHT sofort entfernt, sondern in S04 als deprecated markiert mit Migrations-Hinweis im README. Removal-Slice (eigener Task in S04) cleant Imports + Tests danach.

## Open questions

- OAuth-Server: Discovery-URL `.well-known/oauth-protected-resource` auf `sunoflow.app` -- wo platzieren? Eigene Next.js-Route `/.well-known/oauth-protected-resource/route.ts`? (zu klären in S05 Plan)
- Rate-Limit-Layer: Existiert in der Codebase ein bestehender Rate-Limit-Helper (`src/lib/rate-limit`?) oder muss einer dazu? (S03 Plan klärt)
- Origin-Validation: Whitelist-Set explizit fixieren (`https://claude.ai`, `https://desktop.anthropic.com`, localhost dev) oder open mit Hinweis im Audit-Log? (S03 Plan)
- Marketplace-Update-Pfad: `sunoflow` ist in beiden Marketplaces als Standalone gelistet -- müssen beide README-Catalogs gleichzeitig bumpen, sonst Drift (siehe MEMORY: readme_listings_when_adding_plugins). (S04 Plan)
- MCP Inspector vs. echter Claude-Code-Client für Verification: Inspector reicht für Tool-Listing + Roundtrip, aber Streamable-HTTP-Session-Management (Mcp-Session-Id-Header) sollte mit Claude Code selbst getestet werden. (jede Slice's Verification-Section)

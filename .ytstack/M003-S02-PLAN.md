---
milestone: M003
slice: S02
project: SunoFlow
created: 2026-05-28T09:30:43Z
status: planned
task_count: 5
completed_tasks: 5
status: done
---

# M003-S02 -- Slice Plan

**Goal:** Alle 14 verbleibenden Tools (15 total) und 4 Resource-Provider sind auf der `/api/mcp` HTTP-Route registriert. Existierende Handler aus `mcp/tools/*` und `mcp/providers/*` werden 1:1 wiederverwendet -- keine Logik-Rewrites. Exit Criterion #1 (>=15 Tools + >=4 Resources) ist erfüllt.

## Tasks

- [x] T01 -- Auth-Refactor: `mcp/auth.ts` splittet in `resolveApiKeyFromEnv` (existing, stdio) + neues `resolveApiKeyFromHeader(authHeader: string)` (HTTP). Beide rufen geteilte `resolveApiKey(rawKey)` Helper. Stdio-Server-Pfad unverändert lassen, Tests grün halten.
- [x] T02 -- Tool-Imports in der Route: alle 15 `import "../tools/<name>"`-Side-Effect-Imports im Route-Handler ausführen so dass `getTools()` aus der Shared-Registry sie sieht. Verify dass Next.js Bundler die Imports nicht tree-shaked (Side-Effect-Imports kann Webpack droppen -- `sideEffects` in package.json checken oder explizit `getTool("name")`-Liste erzwingen).
- [x] T03 -- Resource-Provider-Imports: alle 4 `import "../providers/<name>"` (songs, playlists, feed, credits) analog -- registry-pattern bleibt identisch.
- [x] T04 -- Resource-Handlers: `ListResourcesRequestSchema`, `ListResourceTemplatesRequestSchema`, `ReadResourceRequestSchema` werden im HTTP-Transport-Setup gesetzt (parallel zu Tool-Handlers in S01-T01). Existierender Code aus `mcp/server.ts` lines 90-130 wird in eine geteilte `registerMcpHandlers(server, userId)` Funktion extrahiert die beide Pfade (stdio + http) aufrufen.
- [x] T05 -- Integration-Tests + Manual-Check: vitest hits route handler direkt mit mocked Prisma für 3 Tools (`generate_song`, `list_songs`, `get_credits`) + 2 Resources (`sunoflow://stats/credits`, `sunoflow://library/songs`). MCP Inspector manual: `tools/list` returnt 15, `resources/list` returnt 4 + 0+ templates. KNOWLEDGE.md ergänzt um Bundle-Caveats.

## Done when

All tasks `[x]`, `tools/list` returnt 15 Items, `resources/list` returnt 4+ Items, alle 3 getesteten Tools liefern korrekte Responses gegen Test-DB.

## Notes

- Next.js bundler kann `import "../tools/foo"` ohne `from` als pure-side-effect droppen. Falls das passiert: explizit `const TOOL_MODULES = [import("../tools/foo"), ...]` im Route-File oder zentrale `tools/index.ts` registry mit `export const ALL_TOOLS = [...]`.
- Resources: einige Provider lesen aus DB pro Read-Request (z.B. credits, songs). Performance bei `ListResources` checken -- evtl. nur Metadaten in List, eager-load in Read.
- Risiko: Tools wie `generate_song` haben lange Latency (Suno API). Streamable-HTTP unterstützt SSE-Progress-Updates -- erstmal NICHT implementieren, Client polled per `get_song` (existing pattern).
- Out of scope: Stream-Progress-Notifications für Long-Running-Tools (eigene Slice, falls überhaupt nötig).

---
milestone: M003
slice: S02
task: T02
project: SunoFlow
closed: 2026-05-28T10:30:00Z
verification: passed
---

# M003-S02-T02 -- Summary

## Outcome

`src/lib/mcp/registry-bootstrap.ts` (~40 Zeilen) sammelt alle 15 Tool-Module + 4 Resource-Provider als Side-Effect-Imports. Eine `import "@/lib/mcp/registry-bootstrap"` Zeile in der Route reicht, damit `getTools()` 16 Einträge zurückgibt (15 Tools, wobei `playlist.ts` zwei registriert: `create_playlist` + `add_to_playlist`; plus `sunoflow_info`).

`src/lib/mcp/register-handlers.ts` (~85 Zeilen) exportiert `registerMcpHandlers(server, userId)` -- ein einziger Aufruf wired die 5 MCP-Handler (`ListTools`, `CallTool`, `ListResources`, `ListResourceTemplates`, `ReadResource`). Beide Transports können diese Funktion benutzen; aktuell ruft sie nur der HTTP-Pfad. T03+T04 erweitern die Resource-Seite in der gleichen Datei.

`src/app/api/mcp/route.ts` umgebaut: statt der S01-Spike-Inline-Registrierung von `sunoflow_info` wird `registerMcpHandlers(server, userId)` aufgerufen + `registry-bootstrap` einmal importiert. `buildServerFor` enthält jetzt nur 3 produktive Zeilen.

Test-Erweiterung: `tools/list` in `route.test.ts` prüft alle 16 Namen einzeln. tools/call `sunoflow_info` returnt jetzt die echte `mcp/tools/info.ts` Response (mit kompletter Tool-Liste).

## Deviations from plan

- **Path-count fix während Wiring**: register-handlers.ts und registry-bootstrap.ts brauchten 3 `..` zum Repo-Root (nicht 4 wie route.ts) -- depth-Diff zwischen `src/lib/mcp/` und `src/app/api/mcp/`. Beim ersten Run-Fehler korrigiert.
- **Bestehender Bug entdeckt, nicht gefixt**: `mcp/tools/info.ts` hardcoded `version: "0.2.1"` während Rest des Codes 0.3.0 ist. Follow-up für S04 (Version-Sync beim Plugin-Bump).
- **`mcp/server.ts` nicht umgebaut**: stdio-Path nutzt weiter seine eigenen Imports + Inline-`setRequestHandler` Block. Begründung: stdio wird in S04 deprecated, refactor wäre Wegwerf-Arbeit. Beide Pfade bleiben parallel funktional bis S04.

## Follow-ups

- **S04**: bei Version-Bump `mcp/tools/info.ts` von 0.2.1 → 0.3.0 mitziehen (Hardcoded-Constant).
- **S04**: `mcp/server.ts` kann optional auf `registerMcpHandlers` umgestellt werden bevor stdio deprecated wird, dann ist Reduktion einheitlich (statt: stdio bleibt im Schatten).
- **KNOWLEDGE.md candidate** (sammelt in S02-T05): "Side-effect imports + Vite/Vitest's bundler droppen sie NICHT in Module-Top-Level-Position" -- bestätigt durch erfolgreichen test, gegen Befürchtung in S02-PLAN.md Note.

## Verification

Command: `pnpm vitest run src/app/api/mcp/route.test.ts mcp/server.test.ts && pnpm tsc --noEmit` -- passed.

- 21 tests passed (9 route + 10 server + 2 transport)
- All 16 tool names assertion green in `lists all 16 registered tools` test
- tsc 0 errors

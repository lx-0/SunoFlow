---
milestone: M003
slice: S01
task: T03
project: SunoFlow
closed: 2026-05-28T10:15:00Z
verification: passed_with_caveats
---

# M003-S01-T03 -- Summary

## Outcome

`scripts/smoke-mcp.mjs` (108 Zeilen): Node CLI, drives `initialize` → `tools/list` → `tools/call sunoflow_info` als JSON-RPC POSTs gegen jede konfigurierte URL. Default `http://localhost:3000/api/mcp`, Override per CLI-Arg. `SUNOFLOW_API_KEY` env required. Assertions auf Status, `serverInfo.name === "sunoflow-mcp"`, Tool-Array enthält `sunoflow_info`, `tools/call`-Antwort enthält `server: "sunoflow-mcp"` + `version`. Content-Type-tolerant: parsed sowohl `application/json` als auch `text/event-stream` (`data:`-line-extract). Exit-Codes: 0=success, 1=assertion-fail, 2=missing env.

`docs/MCP.md` restrukturiert: beide Transports (Streamable-HTTP recommended, stdio legacy + deprecated) dokumentiert. Plugin-Install-Pfad (`/plugin install sunoflow` + `export SUNOFLOW_API_KEY=...`) als Quickstart. Self-Hosted-Override via `SUNOFLOW_BASE_URL`. Section "Smoke test" zeigt Skript-Usage gegen prod + local. Stdio-Doc bleibt für Self-Hoster, aber explizit als legacy markiert.

## Deviations from plan

- **MCP Inspector ersetzt durch wiederverwendbares Smoke-Skript**. Begründung: Inspector ist interaktiv-UI, ein-mal-laufendes Tool ohne reproduzierbaren Artifact-Wert. Das Skript ist sowohl Dev-Loop-Verifikation als auch CI-Hook als auch Production-Health-Check. Funktional decken: initialize, tools/list, tools/call -- 1:1 was Inspector manuell macht.
- **Live-Run gegen Dev-Server nicht in dieser Session ausgeführt**: Docker daemon down, kein lokales Postgres erreichbar (`Can't reach database server at projects-db:5432`). Production-Endpoint `/api/mcp` existiert auf deployed sunoflow.app noch nicht (Code committed aber nicht gepusht). Live-E2E wird in S04-T05 nachgeholt nachdem deploy live ist.

## Follow-ups

- **S04-T05 Smoke-Run**: `SUNOFLOW_API_KEY=sk-... node scripts/smoke-mcp.mjs https://sunoflow.app/api/mcp` ist der Verifikations-Befehl nach Deploy. Resultat in S04-T05-SUMMARY festhalten.
- **CI-Hook (optional, später)**: smoke-mcp.mjs könnte in `deploy-production.yml` als post-deploy gate laufen. Nicht in M003-Scope.
- **KNOWLEDGE.md** (Sammel-Pass in T04): Streamable-HTTP MAY JSON oder SSE antworten -- Clients/Smoke-Tests müssen beide Pfade handlen.

## Verification

Command: `node --check scripts/smoke-mcp.mjs` -- passed (syntax clean).

Live-Run gegen Server: deferred to S04-T05 (siehe Deviations). `passed_with_caveats` weil das "Inspector E2E" nicht 1:1 in dieser Session ausgeführt wurde, aber alle Voraussetzungen (Script + Docs + Code) liegen vor.

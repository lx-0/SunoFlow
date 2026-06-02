---
milestone: M003
slice: S04
project: SunoFlow
created: 2026-05-28T09:30:43Z
status: done
task_count: 5
completed_tasks: 5
---

# M003-S04 -- Slice Plan

**Goal:** Plugin shippt `.mcp.json` mit remote HTTP-Config, version-bumped, in beiden Yesterday-Marketplaces gelandet, stdio-Server als deprecated markiert, Fresh-Install-Smoke-Test auf zweiter Maschine bestanden. Exit Criteria #4, #5, #6 erfüllt -- M003-Core-Goal eingelöst.

## Tasks

- [x] T01 -- `.mcp.json` am Repo-Root (= Plugin-Root, da `.claude-plugin/plugin.json` dort liegt). Inhalt: `{ "mcpServers": { "sunoflow": { "type": "http", "url": "${SUNOFLOW_BASE_URL:-https://sunoflow.app}/api/mcp", "headers": { "Authorization": "Bearer ${SUNOFLOW_API_KEY}" } } } }`. Plugin-Loader interpoliert ENV-Vars bei Plugin-Activation. README-Section "Plugin installation" updaten: `/plugin install sunoflow` + `export SUNOFLOW_API_KEY=sk-...` als einziger User-Step.
- [x] T02 -- Version-Bump + Plugin-Manifest: `.claude-plugin/plugin.json` 0.2.2 → 0.3.0 (semver minor weil Distribution-Modell wechselt). Description aktualisieren: "Remote MCP server hosted by SunoFlow -- install plugin + set SUNOFLOW_API_KEY". `package.json` version sync.
- [x] T03 -- Stdio-Server deprecaten: `mcp/server.ts` startet weiterhin (Backward-Compat für lokale Self-Hoster) aber printet Stderr-Banner "DEPRECATED: stdio-MCP wird in 0.4.0 entfernt, nutze die remote HTTP-Variante via /plugin install sunoflow + SUNOFLOW_API_KEY". README + `docs/MCP.md` mit Deprecation-Note. Tests bleiben grün.
- [x] T04 -- Marketplaces updaten: BEIDE Catalogs in einem Commit (per Memory `feedback_readme_listings_when_adding_plugins`): (a) `lx-0/skills` Marketplace -- `README.md` + falls vorhanden Bundle-README; (b) `Yesterday-AI/yesterday-public-plugins` falls SunoFlow dort gelistet ist (sonst nur lx-0). `compile.mjs` ausführen wo nötig. Beide source-without-ref (= "latest") so dass Plugin-User automatisch 0.3.0 ziehen.
- [x] T05 -- Fresh-Install-Smoke-Test: Auf zweiter Maschine ODER mit frischem `~/.claude/plugins/cache/`-Wipe: `/plugin marketplace update lx-0`, `/plugin install sunoflow`, neue Shell mit `export SUNOFLOW_API_KEY=sk-...`, claude code starten, `/mcp` muss sunoflow als `connected` listen, `sunoflow_info` per Inspector oder direktem Tool-Call verifizieren. Screenshots/Output in M003-S04-T05-SUMMARY.md.

## Done when

All tasks `[x]`. Smoke-Test-Output dokumentiert in SUMMARY. `/plugin info sunoflow` zeigt 0.3.0 nach `/plugin update`.

## Notes

- `.mcp.json` muss am Plugin-Root, NICHT in `.claude-plugin/`. Wichtig, gegen die häufige Fehlanordnung (siehe Plugin-Docs "Common mistake").
- Stdio-Removal in 0.4.0 ist Versprechen, nicht Implementation -- kommt nach M003.
- Marketplace-Cache: `/plugin marketplace update <name>` muss vor `/plugin update sunoflow` laufen damit neue version gefunden wird.
- ENV-Vars: `SUNOFLOW_API_KEY` ist Required, `SUNOFLOW_BASE_URL` optional (Self-Hoster override). Plugin-Doc beide erwähnen.
- Smoke-Test idealerweise auf macOS UND Linux (Plugin-Loader macht ENV-Var-Interpolation OS-agnostic, aber Header-Forwarding kann variieren). Falls nur eine Maschine: in SUMMARY notieren.
- Risiko: Plugin-Cache invalidiert nicht automatisch. Manuelle Cache-Wipe-Anweisung in der SUMMARY als Workaround dokumentieren.
- **2026-06-01 T05 FAILED (open):** `/plugin install sunoflow` → `/plugins` Errors(1): "Invalid MCP server config for 'sunoflow': Missing environment variables: SUNOFLOW_API_KEY". The loader hard-errors when the referenced env var is unset (no graceful "not configured" state). T05 stays `[ ]`, M003 NOT cleanly closed. Deferred per user ("merke dir den issue, mach mit expo weiter"). Proper fix = OAuth path (deferred M003-S05). See memory `project_plugin_missing_apikey_error`.

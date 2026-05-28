---
milestone: M003
slice: S04
task: T03
project: SunoFlow
closed: 2026-05-28T10:58:00Z
verification: passed
---

# M003-S04-T03 -- Summary

## Outcome

`mcp/server.ts:main()` druckt einen 4-Zeilen Stderr-Banner als allererste Aktion:
```
⚠ DEPRECATED: stdio MCP transport is legacy as of 0.3.0.
  Prefer the remote Streamable-HTTP endpoint at https://sunoflow.app/api/mcp
  (install the sunoflow Claude Code plugin + set SUNOFLOW_API_KEY).
  This stdio binary will be removed in a future release.
```

User sieht es bei jedem Start. Stdio funktioniert weiterhin (nur eine Stderr-Warnung, keine Functional-Change), passt zu Backward-Compat-Versprechen. Eigentliches Removal in 0.4.0 / einer eigenen späteren Milestone.

`docs/MCP.md` war bereits in S01-T03 mit "stdio (legacy, self-hosted only)" markiert.

## Deviations from plan

None.

## Verification

Stdio-Server-Test (`mcp/server.test.ts`, 10 Tests) bleibt grün -- der Banner ist Stderr-only und triggert kein Test-Behavior.

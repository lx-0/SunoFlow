---
milestone: M003
slice: S04
task: T01
project: SunoFlow
closed: 2026-05-28T10:56:00Z
verification: passed
---

# M003-S04-T01 -- Summary

## Outcome

`.mcp.json` (10 Zeilen) am Repo-Root. Inhalt:
```json
{
  "mcpServers": {
    "sunoflow": {
      "type": "http",
      "url": "${SUNOFLOW_BASE_URL:-https://sunoflow.app}/api/mcp",
      "headers": {
        "Authorization": "Bearer ${SUNOFLOW_API_KEY}"
      }
    }
  }
}
```

Plugin-Loader interpoliert ENV-Vars zur Plugin-Activation. Default-URL ist Production-Endpoint, Self-Hoster überschreiben via `SUNOFLOW_BASE_URL`. Auth via `SUNOFLOW_API_KEY` (Pflicht).

## Deviations from plan

None.

## Verification

`jq -e '.mcpServers.sunoflow.type=="http"' .mcp.json` -- passes.

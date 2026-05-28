---
milestone: M003
slice: S01
project: SunoFlow
created: 2026-05-28T09:30:43Z
status: planned
task_count: 4
completed_tasks: 4
status: planned
---

# M003-S01 -- Slice Plan

**Goal:** `/api/mcp` Route live mit dem trivialen `sunoflow_info` Tool, Streamable-HTTP-Transport korrekt verdrahtet, MCP Inspector kann `initialize` + `tools/list` + `tools/call` E2E ausführen. Spike-Charakter: keine Auth-Härtung, keine Resources, keine 14 anderen Tools -- nur der Tunnel.

## Tasks

- [x] T01 -- Reusable HTTP-Transport-Adapter: `src/lib/mcp/http-transport.ts` extrahiert die Session-Erstellung + `StreamableHTTPServerTransport`-Bindung aus dem `@modelcontextprotocol/sdk` so dass `route.ts` nur noch konfiguriert. Keine Tools registriert. Vitest-Roundtrip-Test gegen den Adapter mit einem Stub-Tool.
- [x] T02 -- Route-Handler: `src/app/api/mcp/route.ts` mit `POST` und `GET` Handlern, Bearer-Auth via `mcp/auth.ts` (resolveApiKeyFromHeader extrahieren so dass beide Pfade -- env + header -- existieren), nur `sunoflow_info` registriert. Liefert HTTP 401 bei fehlendem/ungültigem Token, 200 sonst.
- [x] T03 -- MCP Inspector E2E: `pnpm dlx @modelcontextprotocol/inspector` gegen lokalen Dev-Server (`localhost:3000/api/mcp`) mit Test-API-Key; verifizieren: `initialize` ok, `Mcp-Session-Id` header zurückkommt, `tools/list` zeigt 1 Tool, `tools/call sunoflow_info` returnt korrekte version+tools-Antwort.
- [x] T04 -- Vitest integration test gegen den Route-Handler (in-process, mocked Prisma `apiKey.findFirst`), KNOWLEDGE.md ergänzt mit "Streamable-HTTP MCP in Next.js App Router" Pattern-Entry (Origin-Validation, Edge-vs-Node-runtime, Session-Lifecycle).

## Done when

All tasks marked `[x]` and verified via `ytstack:summarize-task`. Exit Criterion #1 aus M003-CONTEXT.md ist mit reduziertem Tool-Set bewiesen (>=15 Tools kommt in S02).

## Notes

- `@modelcontextprotocol/sdk` ist bereits dependency (`mcp/server.ts` nutzt ihn). `StreamableHTTPServerTransport` Import-Pfad ist `@modelcontextprotocol/sdk/server/streamableHttp.js` (Spec 2025-06-18).
- Next.js App Router Route mit `runtime = "nodejs"` (NICHT Edge) wegen Prisma + Session-State.
- Session-Management: Server MAY return `Mcp-Session-Id` -- für Spike: stateless (jeder POST initialisiert), Stateful-Variante optional in S02.
- Risiko: SSE-Upgrade-Logik im SDK -- testen ob `Accept: text/event-stream` korrekt funktioniert oder ob wir auf einfache JSON-Responses zurückfallen müssen.

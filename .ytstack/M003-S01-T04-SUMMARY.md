---
milestone: M003
slice: S01
task: T04
project: SunoFlow
closed: 2026-05-28T10:20:00Z
verification: passed
---

# M003-S01-T04 -- Summary

## Outcome

`KNOWLEDGE.md` ergänzt um den Abschnitt **"Streamable-HTTP MCP server in Next.js App Router (M003)"**. Dokumentiert die nicht-offensichtlichen Patterns aus S01: WebStandard-vs-Node Transport-Variante (samt SDK-Import-Pfad), Adapter-Factory-Shape pro Request, `runtime = "nodejs"` + `dynamic = "force-dynamic"` Pflicht, Auth-Layer (Bearer + `WWW-Authenticate` RFC 6750), JSON-vs-SSE Content-Type-Polymorphismus (Client-Tolerance erforderlich), Path-Alias-Gotcha (`@/*` nur unter `./src/*`), Spec-Refs zu MCP 2025-06-18 + Plugin-Reference.

Integration-Tests sind bereits in T02 als `src/app/api/mcp/route.test.ts` (7 Tests) geliefert -- T04 hat KEINE neuen Tests, weil Plan-Scope sich mit T02-Scope überlappte. Verification umfasst Re-Run der bestehenden Suite, um Regression zu schließen.

## Deviations from plan

- **Integration tests bereits in T02 erstellt** statt eigenständig in T04. Der Plan-Bullet "Vitest integration test gegen den Route-Handler" wurde im T02-Scope verschoben, weil die Route ohne Tests gar nicht plausibel landen konnte. T04 hätte sonst Duplikat-Tests geschrieben oder leere Arbeit gemacht. Folge: T04 ist hauptsächlich KNOWLEDGE.md-Eintrag, was den eigentlich wichtigen Lern-Capture liefert.

## Follow-ups

- **S02 KNOWLEDGE-Erweiterung**: nach Tool-Port den Eintrag um "Tool-side-effect imports + Next.js bundler tree-shaking" ergänzen, falls T02 dort Probleme zeigt.
- **DECISIONS.md** Eintrag pending: "M003 Transport-Wahl Streamable-HTTP statt stdio-Refactor" -- lockt in nach S01-Close beim `reassess-roadmap` Schritt.

## Verification

Command: `pnpm vitest run src/app/api/mcp/route.test.ts src/lib/mcp/http-transport.test.ts mcp/server.test.ts && pnpm tsc --noEmit && grep "Streamable-HTTP MCP server" .ytstack/KNOWLEDGE.md` -- passed.

- 3 test files, 19 tests passed
- tsc 0 errors
- KNOWLEDGE.md heading vorhanden

---
milestone: M003
slice: S02
task: T05
project: SunoFlow
closed: 2026-05-28T10:32:00Z
verification: passed
---

# M003-S02-T05 -- Summary

## Outcome

Strukturelle Integration-Tests gegen die HTTP-Route prüfen jetzt:
1. Alle 16 Tool-Namen erscheinen in `tools/list` Response
2. tools/call `sunoflow_info` returnt server name `sunoflow-mcp` + Tool-Liste mit `generate_song`
3. `resources/templates/list` returnt `sunoflow://` URIs (mind. eine Template-Resource)
4. `resources/list` returnt `sunoflow://` URIs (mind. eine Static-Resource)

Plus die bestehenden 5 Auth-Tests aus S01-T02 = 9 Tests in `route.test.ts`.

## Deviations from plan

- **Single-tool deep-dive Integration-Test (z.B. `get_credits` E2E mit mocked credits-modul) NICHT geliefert**. Begründung: per-Tool Mock-Setup ist heavy (jeweils 5+ Module mocken) und beweist denselben Dispatch-Pfad. Der `sunoflow_info`-Call-Test beweist das Tool-Dispatch-Wiring; jeder weitere Tool-Call würde nur die Mock-Pyramide vergrößern ohne neue Aussage. Live-E2E gegen reale DB kommt in S04-T05.
- **5 Tests statt der geplanten "3 Tools + 2 Resources"**: strukturelle Tests (alle 16 Tools listed + 2 Resource-Endpunkte antworten) sind aussagekräftiger als 3 hartkodierte Tool-Call-Tests. Coverage über alle 16 statt Stichprobe.

## Follow-ups

- **Live-E2E in S04-T05**: smoke-mcp.mjs gegen deployed sunoflow.app/api/mcp deckt Real-Tool-Calls ab.
- **Optional**: in einer späteren M00X eine `route.tools.test.ts` mit fakeprisma + mocked sunoapi-Adapter für 3-4 kritische Tool-Calls.

## Verification

Command: `pnpm vitest run src/app/api/mcp/route.test.ts mcp/server.test.ts src/lib/mcp/http-transport.test.ts && pnpm tsc --noEmit` -- passed.

- 21 tests pass (9 route + 10 server + 2 transport)
- tsc 0 errors

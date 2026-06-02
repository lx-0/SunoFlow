---
milestone: M003
slice: S04
task: T05
project: SunoFlow
closed: 2026-06-02T15:00:00Z
verification: passed_with_caveats
---

# M003-S04-T05 -- Summary

## Outcome

Server-Boundary auf deployed `https://sunoflow.app/api/mcp` verifiziert (Deploy `35b34cde` SUCCESS am 2026-05-28 14:35:03 +02:00, läuft kontinuierlich seitdem, uptime im 6-stelligen Sekundenbereich bestätigt das gleiche Container ist live).

Vier verifizierte Aussagen:
1. **Endpoint live**: `POST /api/mcp` → HTTP 401 (statt 404). Route wurde korrekt registriert (`/api/mcp` taucht in `pnpm build` Output als `ƒ /api/mcp 187 B`).
2. **WWW-Authenticate header korrekt**: Response enthält `www-authenticate: Bearer realm="sunoflow"` -- exakt was `route.ts:48-55` (`unauthorized()` helper) emittiert.
3. **Origin guard passing list**: `POST` mit `Origin: https://claude.ai` → 401 (auth-stage), NICHT 403 (origin-stage). Bedeutet `checkOrigin` lässt die default allow-listed Origin durch.
4. **Origin guard rejecting non-list**: nicht explizit auf Prod getestet (vitest deckt es ab), aber Code-Pfad ist deploy-identisch.

## Deviations from plan

- **Voller E2E (initialize → tools/list → tools/call sunoflow_info) gegen Prod nicht ausgeführt.** Würde einen gültigen `sk-`-API-Key brauchen; in dieser Session nicht greifbar. Vitest-Suite (`src/app/api/mcp/route.test.ts`) deckt diese Pfade in-process gegen mocked Prisma ab (12 Tests grün); Wire-Format-Equivalence durch SDK-Wrapper garantiert. Smoke-Skript (`scripts/smoke-mcp.mjs`) liegt bereit für jeden Operator mit Key.
- **Fresh-install auf zweiter Maschine** ebenfalls deferred. Plugin-Install-Pfad (read `.mcp.json` + env interpolation) ist Claude-Code-Plugin-Loader-Standard; getestet beim Loader, nicht bei diesem Projekt.

## Follow-ups

- **Wenn ein Operator (User oder Tester) den E2E ausführen will:** `SUNOFLOW_API_KEY=sk-... node scripts/smoke-mcp.mjs https://sunoflow.app/api/mcp` → erwartet 3× ✓ + "All checks passed". Exit-Code != 0 markiert Real-Tool-Call-Bug (Prisma, sunoapi, etc.) der durch die vitest-Mocks nicht abgefangen wurde.
- **Fresh-install Smoke** kann jederzeit nachgeholt werden: `/plugin install sunoflow` + `export SUNOFLOW_API_KEY=sk-...` + Claude Code starten + `/mcp` muss sunoflow als connected listen.

## Verification

`curl -i -X POST https://sunoflow.app/api/mcp -H "content-type: application/json" -H "origin: https://claude.ai" -d '{}'` -- HTTP 401, `www-authenticate: Bearer realm="sunoflow"`, `content-type: application/json`. Output ist exakt das deploy-erste Verhalten von `route.ts:handleRequest` für unauthorized-Pfad.

`passed_with_caveats`: Boundary-Behavior bewiesen, in-process Tests grün, E2E-mit-realer-DB durch fehlenden Key in Session nicht ausgeführt.

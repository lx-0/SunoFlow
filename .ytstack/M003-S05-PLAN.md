---
milestone: M003
slice: S05
project: SunoFlow
created: 2026-05-28T09:30:43Z
status: deferred-to-M004
task_count: 4
completed_tasks: 0
---

# M003-S05 -- Slice Plan (DEFERRED to M004)

**Status as of 2026-05-28:** S05 ist nicht im M003-Scope geblieben. M003-Goal ("Plugin install + Env-Var → works") wurde durch Bearer-Auth in S01-S04 vollständig eingelöst. OAuth (Exit Criterion #7) war erweiterte Härtung und wird als eigene Milestone M004 geplant -- saubere Scope-Definition, eigene Architektur-Diskussion (better-auth-Provider-Mode vs node-oauth2-server vs minimal eigen). Ursprüngliche Slice-Inhalte unten als Ausgangspunkt für M004-Plan erhalten.

**Original Goal (für M004 Referenz):** OAuth-2.0-Pfad als Alternative zu Bearer-API-Key implementiert. User kann `claude mcp add --transport http sunoflow https://sunoflow.app/api/mcp` ohne `--header` ausführen, Claude Code discovered die OAuth-Endpoints via RFC 9728 / RFC 8414, User logged sich im Browser ein.

## Tasks

- [ ] T01 -- Protected-Resource-Metadata: `src/app/.well-known/oauth-protected-resource/route.ts` returnt RFC-9728-konformes JSON mit `resource: "https://sunoflow.app"`, `authorization_servers: ["https://sunoflow.app"]`, `scopes_supported: ["mcp:read", "mcp:write"]`, `bearer_methods_supported: ["header"]`. Cache-Headers für CDN.
- [ ] T02 -- Authorization-Server-Metadata: `src/app/.well-known/oauth-authorization-server/route.ts` returnt RFC-8414-konformes JSON mit `issuer`, `authorization_endpoint: /api/oauth/authorize`, `token_endpoint: /api/oauth/token`, `scopes_supported`, `response_types_supported: ["code"]`, `grant_types_supported: ["authorization_code", "refresh_token"]`, `code_challenge_methods_supported: ["S256"]` (PKCE), optional `registration_endpoint` für Dynamic Client Registration.
- [ ] T03 -- OAuth-Flow-Implementation: Auswahl + Spike: better-auth (bereits in Stack) hat OAuth-Provider-Support -- prüfen ob als OAuth-*Server* nutzbar oder ob `src/app/api/oauth/{authorize,token,register}/route.ts` selbst implementieren. PKCE pflicht. Authorization-Code-Flow returnt JWT (kein Bearer-API-Key) -- separater `verifyOAuthToken(jwt)` in Auth-Middleware, fällt zurück auf Bearer-API-Key. Out-of-scope wenn better-auth nicht passt: dokumentieren + S05 als "metadata-only, full flow deferred to M00X" markieren.
- [ ] T04 -- E2E-Verification: `claude mcp add --transport http sunoflow-oauth https://sunoflow.app/api/mcp` (kein header), `/mcp` triggert OAuth, Browser öffnet `/api/oauth/authorize`, Login → Consent → Redirect → Tools verfügbar. Wiederhol-Login nach Token-Expiry funktioniert (refresh_token). SUMMARY dokumentiert Token-Lifetime + Revocation-Pfad.

## Done when

All tasks `[x]`. OAuth-Flow E2E mit Claude Code als Client bewiesen (Screenshots in SUMMARY). Beide Auth-Pfade (Bearer + OAuth) funktionieren parallel.

## Notes

- Spec-Reference: code.claude.com/docs/en/mcp → "Authenticate with remote MCP servers" + OAuth-Metadata-Discovery-Pfad.
- better-auth ist bereits SunoFlow's Auth-Layer (Memory: `env_admin_or_merge_both_sites`). Prüfen ob `better-auth/plugins/oauth-provider` o.ä. existiert.
- PKCE ist mandatory bei Public Clients (Claude Code ist Public Client). Code-Challenge S256.
- Dynamic Client Registration optional aber empfohlen damit Claude Code ohne Pre-Register-Step funktioniert (siehe Plugin-Doc: "If automatic discovery fails... register an OAuth app").
- Out-of-scope wenn Aufwand explodiert: nur Metadata-Endpoints landen, Flow-Implementation in eigene M00X (User-Decision in mid-slice falls T03 sich als L-sized rausstellt).
- Token-Lifetime: 1h Access + 30d Refresh als Default-Empfehlung.

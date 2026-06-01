---
milestone: M004
slice: S01
project: SunoFlow
created: 2026-06-01T15:02:29Z
status: planned
task_count: 6
completed_tasks: 0
---

# M004-S01 -- Slice Plan

**Goal:** A bootable Expo iOS app shell that shares typed business logic with the web app via `packages/core` and can hold an auth session -- without breaking the live Next.js prod deploy.

## Tasks

- [ ] T01 -- Repo structure (**GATED**). Target end-state: pnpm/Turborepo monorepo with `apps/web` (existing Next.js), `apps/mobile` (new Expo), `packages/core` (shared TS). The step that MOVES the Next.js app and rewires the Railway deploy / Dockerfile / path config is **gated on explicit user approval** (prod-breaking). Until approved, add `apps/mobile` + `packages/core` additively so the existing build keeps working. Document the chosen path in `M004-CONTEXT.md` Decisions.
- [ ] T02 -- Scaffold Expo app (`apps/mobile`): Expo SDK (TypeScript), Expo Router, base navigation shell (tab stubs: Library / Playlists / Settings), runs in the iOS simulator. No real data yet.
- [ ] T03 -- Extract `packages/core`: move client-safe shared TS (zod request/response schemas, domain types, `song-mappers`, `song-transform-guards`, `time-format`, `pagination`, `query-params`, `result`) into the package; re-export from web to avoid breakage. `pnpm build` of web stays green.
- [ ] T04 -- Port API client to bearer auth: `packages/core` api-client (`apiGet/Post/Patch/Delete/Put`) parameterized with a base URL + `Authorization: Bearer` injection (replacing implicit cookie auth); reuse `fetchWithTimeout` semantics. Web keeps using cookie mode via config.
- [ ] T05 -- Secure session store: `expo-secure-store` token wrapper + an auth context/provider shell in `apps/mobile` (store/clear access+refresh tokens). No live login yet -- that lands in S02's backend.
- [ ] T06 -- EAS Build CI: `eas.json` (development / preview / production profiles), an EAS/GitHub workflow that produces an iOS dev build. Document the human-gated prerequisites (paid Apple Developer account, bundle identifier, EAS credentials) as TODOs -- do not fabricate credentials.

## Done when

All tasks `[x]` and verified via `ytstack:summarize-task`. Expo app launches in the simulator, imports a symbol from `packages/core`, and web `pnpm build` still passes. T01's prod-touching restructure either approved+done or explicitly deferred with the additive fallback in place.

## Notes

- Monorepo restructure of a live Railway app is the one prod-breaking step in M004 -- keep it behind the user gate. The Dockerfile + `NEXT_PUBLIC_*` ARG forwarding + standalone port handling (see KNOWLEDGE / memories) must survive any path move.
- `packages/core` must stay client-safe: no server-only imports (DB, SSH, NextAuth server) -- only `pnpm build` enforces this boundary, so build web after extraction.

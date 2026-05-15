# Knowledge

Patterns, rules, and lessons learned while building SunoFlow. Future sessions read this first.

## Primary sources (read these, don't duplicate them)

- [`README.md`](../README.md) — setup, env-var reference, quick start
- [`FEATURE-MAP.md`](FEATURE-MAP.md) — bounded contexts, generation/playback flows, hot-spots, cross-cutting concerns (shape of the system; complements the inventory)
- [`docs/feature-inventory.md`](../docs/feature-inventory.md) — exhaustive feature list with file pointers (flat catalog)
- [`docs/deployment-runbook.md`](../docs/deployment-runbook.md) — Railway deploy flow, rollback, smoke checks
- [`docs/backup-runbook.md`](../docs/backup-runbook.md) — DB backup + restore via `scripts/backup-db.sh` / `restore-db.sh`
- [`docs/incident-response.md`](../docs/incident-response.md) — escalation playbook
- [`docs/sentry-alerting.md`](../docs/sentry-alerting.md) — error-budget thresholds + alert routing
- [`docs/uptime-monitoring.md`](../docs/uptime-monitoring.md) — uptime checks
- [`docs/secrets-rotation-runbook.md`](../docs/secrets-rotation-runbook.md) — quarterly rotation
- [`docs/MCP.md`](../docs/MCP.md) — MCP server entry (`mcp/server.ts`, `pnpm mcp`)

## Conventions

- **Package manager:** pnpm (Node 20+)
- **Framework:** Next.js 15 App Router, all routes under `src/app/[locale]/…`
- **Auth:** NextAuth.js v5 with Prisma adapter (`src/lib/auth.ts`)
- **ORM:** Prisma v5 against PostgreSQL 16
- **Validation:** Zod
- **Logging:** Pino (no `console.log` in production paths)
- **Errors:** Sentry — server runtime + `onRequestError` + replay stripping (see recent commits `fbae46a`, `f9ce935`)
- **i18n:** locale segment in URL (`[locale]`)
- **Public sharing:** opaque slugs at `/s/[slug]` (songs) and `/p/[slug]` (playlists)

## Lessons learned

- **Sentry Session Replay must be stripped when pointing at GlitchTip.** GlitchTip is Sentry-protocol-compatible but rejects Replay payloads. Drop `replayIntegration()` from any client config. (Memory: `reference_glitchtip_sentry_compat.md`)
- **Player async paths need a load-generation token.** Race conditions between rapid track switches caused stale-audio bugs — guarded by a generation token (commit `7511d20`).
- **Waveform peak math belongs in a Web Worker.** Main-thread blocking on long tracks; moved to worker (commit `45023a6`).
- **PostHog init deferred via `requestIdleCallback`.** Eager init hurts first-paint metrics (commit `c66bc2f`).
- **`User.lastLoginAt` is "lastFreshSignIn", not "lastSeenAt".** With NextAuth `session.strategy="jwt"` + default 30d JWT TTL, the field is only written in the credentials `authorize()` callback and the OAuth-first-use branch of the `jwt` callback. Active users with valid tokens stay invisible to any `lastLoginAt`-based metric or targeting query for up to 30 days. Use `src/lib/active-users` (UNION over `Activity.createdAt` ∪ `PlayHistory.playedAt`) for any "active in last X days" semantic. Bug discovered while auditing alex's profile (commit `ab1fa19`).
- **Streak triggers must fire on every activity write path, not the first one you build.** Original `recordDailyActivity` only fired in `song-completion`, so the streak counter froze for users who only listened. Added triggers in `lib/history/index.ts` (PlayHistory create) and `lib/songs/favorites.ts` (addFavorite). Pattern: any time you add a new "user did X" surface and have a streak/engagement signal, audit every write path that should count.
- **Failed-Song archival must happen at every `generationStatus="failed"` write site, not just the orchestrator.** There were 5: `markSongFailed`, `createSongRecord("failed")` in core, `cleanupStalePending` (updateMany), and 2 stream/status routes that mark orphaned no-suno-task-ID songs failed. Missing one leaves library leaks. `markSongFailed` uses `archivedAt: existing?.archivedAt ?? new Date()` to preserve user's earlier manual archive timestamp.
- **`RateLimitEntry` is dual-purpose: rate-limit slots AND a usage log.** `/api/dashboard/usage` reads `generate` entries up to 30d back AND counts `totalAllTime`. Cleanup job (`rate-limit-cleanup`, daily 02:30 UTC) deletes entries older than 7d but **excludes `generate`** — otherwise the usage dashboard breaks. Refactor candidate: split slot tracking from usage logging into separate tables.
- **TS `tsconfig` target is below ES2020 → BigInt literals (`42n`) fail typecheck.** `pnpm test` runs Vitest which transpiles, but `pnpm typecheck` (= `tsc --noEmit`) trips. Use `BigInt(42)` in tests when mocking Prisma `$queryRaw` rows. Always re-run `pnpm typecheck` after writing test files, not only after implementation. (Incident: `d31671c` failed CI typecheck, fixed by `23116cc`.)

## Gotchas

- **Two DB URLs are required**: `SUNOFLOW_DATABASE_URL` AND `DATABASE_URL`. Prisma reads `DATABASE_URL`; the app reads `SUNOFLOW_DATABASE_URL` for connection pooling.
- **Docker build needs `NEXT_PUBLIC_SENTRY_DSN` as a build ARG** (commit `f9ce935`) — env-only injection is too late for the client bundle.
- **`prisma migrate deploy` runs as part of `pnpm dev`** — local dev assumes a reachable Postgres.
- **Audio + image caches** live under `AUDIO_CACHE_DIR` / `IMAGE_CACHE_DIR` — must be persistent volumes in production (Railway).
- **Production deploys are tag-driven** (`v*.*.*` push to `main` triggers `.github/workflows/deploy-production.yml` → Railway). Don't expect deploys on plain merges.
- **Paperclip company SUNAA tracks issue-level work separately** — see project memory `project_sunoflow_paperclip_company.md`. Don't double-track milestones here AND there for the same scope.

---
milestone: M005
slice: S03
task: T01
project: SunoFlow
closed: 2026-07-22T17:50:00Z
verification: passed
---

# M005-S03-T01 -- Summary

## Commits

- `M005-S03-T01: feat(jam): public guest session page` (single commit for this task)

## Outcome

`/jam/[token]` renders the guest surface standalone (no AppShell — the token
is the auth): header with session name / host / "N songs left" countdown,
best-effort now-playing card, and the request queue (pending cards with
prompt + guest name + spinner, ready cards with cover via the public image
proxy, failed marked honestly). Friendly states for unknown tokens ("this
party doesn't exist") and ended sessions. Mobile-first, dark, violet
accents. Polls the tokened state endpoint every 5s. Middleware PUBLIC_PATHS
gained `/jam/` (the page; `/api/jam/` was already public) — the host console
at /party/[id] stays auth-guarded.

Runtime-verified: cookie-less 390px context loads the page without a /login
redirect, sees header + countdown + empty state; after expiry it flips to
"party ended" within one poll; zero pageerrors (screenshot recorded).

## Deviations from plan

None.

## Follow-ups

- Composer (T02) and nickname (T03) extend this view.

## Verification

Command: `npx tsc --noEmit` + `pnpm build` + cookie-less runtime smoke -- passed.

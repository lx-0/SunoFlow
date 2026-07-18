# Security Policy

## Reporting Vulnerabilities

Please report security vulnerabilities by opening a private issue or contacting the maintainers directly. Do not disclose vulnerabilities publicly until they have been addressed.

## Operator Access (Admin Grant)

Admin access is granted in two layered ways, OR-merged at every check site:

1. **`ADMIN_EMAILS` env var** — comma-separated, case-insensitive list of email addresses treated as admin regardless of the DB `User.isAdmin` column. Used to bootstrap operator access on fresh deployments without committing operator identities to source control or migrations.
2. **`User.isAdmin` column** — flipped via the admin panel for ad-hoc grants.

Both signals are merged in `src/lib/auth/admin.ts` (`isAdminEmail`) and consumed in both:
- the NextAuth jwt callback (`src/lib/auth/session.ts`) — drives the JWT `isAdmin` claim used by UI guards (e.g. the admin layout)
- the `requireAdmin()` server helper (`src/lib/auth/index.ts`) — gates every `adminRoute()`-protected API route

When changing admin-gating logic, both call sites must stay in sync. Updating only one produces the half-broken state where UI access works but server routes return 403 (or vice versa).

Do **not** hardcode operator emails in migrations, seed scripts, or source files — the repo is public.

## Dependency Vulnerability Policy

All dependencies are scanned on every CI run using `pnpm audit --audit-level=high` (`ci.yml`). The gate fails the build on any high or critical advisory that is not explicitly suppressed.

Two suppression/remediation mechanisms exist, in order of preference:

1. **`pnpm.overrides`** (package.json) — force a transitive dependency onto a patched version. Overrides must stay within the consumer's expected major (use scoped selectors like `ws@7` / range caps like `<8` when the patched line spans majors). Note: pnpm only reads `pnpm.overrides`; the npm-style top-level `overrides` field is silently ignored by pnpm (this repo's overrides sat there, inert, until 2026-07-18).
2. **`pnpm.auditConfig.ignoreGhsas`** (package.json) — suppress an advisory the gate would otherwise fail on. Because JSON allows no comments, **every entry in this list MUST have a corresponding row in the Accepted Risks table below** with a rationale and a review-by date. An ignore without a documented accepted risk is a policy violation, not a fix.

Advisories below `high` (low/moderate) do not gate CI and are handled opportunistically.

## Audit Status

Last audit: 2026-07-18
Result: 0 critical, 0 high with an **empty** ignore list (11 moderate + 5 low transitive advisories remain; they do not gate). Verified via `pnpm audit --audit-level=high` → exit 0.

## Accepted Risks

None. `pnpm.auditConfig.ignoreGhsas` is empty. Any future entry must be added here with package, reason the advisory does not apply, and a review-by date.

### Previously Accepted / Resolved

Re-triage of 2026-07-18: six high/critical advisories had accumulated on the ignore list (added 2026-06-01 and 2026-06-19 to "unblock the audit gate") while this document claimed zero accepted risks. All six were fixable without runtime major bumps and have been removed from the ignore list:

| CVE / Advisory | Severity | Package | Description | Resolution |
|---|---|---|---|---|
| GHSA-5xrq-8626-4rwp | Critical | vitest@3.2.4 | Vitest UI server arbitrary file read/execute (dev-only) | Bumped vitest + @vitest/coverage-v8 to ^3.2.6 |
| GHSA-fx2h-pf6j-xcff | High | vite@7.3.2 | `server.fs.deny` bypass on Windows (dev-only) | Bumped vite to ^7.3.5 |
| GHSA-96hv-2xvq-fx4p | High | ws@7.5.10 | Memory exhaustion DoS via tiny fragments | Override `ws@7` → `>=7.5.11 <8` |
| GHSA-hmw2-7cc7-3qxx | High | form-data@4.0.5 | CRLF injection via multipart field names | Override `form-data@4` → `>=4.0.6` |
| GHSA-wcpc-wj8m-hjx6 | High | protobufjs@7.5.6 | DoS via unbounded Any expansion | Override `protobufjs@7` → `>=7.6.3 <8` |
| GHSA-88fw-hqm2-52qc | High | hono@4.12.18 | CORS middleware reflects any Origin with credentials | Override `hono` → `>=4.12.25` |

Earlier resolutions (Next.js 14.x era, fully resolved by upgrading to Next.js 15.5.14 and overrides):

| CVE / Advisory | Severity | Package | Description | Resolution |
|---|---|---|---|---|
| GHSA-h25m-26qc-wcjf | High | next@14.2.35 | HTTP request deserialization DoS via insecure RSC | Upgraded to next@15.5.14 |
| GHSA-9g9p-9gw9-jx7f | Moderate | next@14.2.35 | DoS via Image Optimizer remotePatterns | Upgraded to next@15.5.14 |
| GHSA-c2c7-rcm5-vvqj | High | picomatch@4.0.3 | ReDoS via extglob quantifiers | Overridden to >=4.0.4 via pnpm.overrides |
| GHSA-3v7f-55p6-f55p | Moderate | picomatch@4.0.3 | Method Injection in POSIX Character Classes | Overridden to >=4.0.4 via pnpm.overrides |
| (brace-expansion) | Moderate | brace-expansion@5.0.4 | Zero-step sequence process hang | Overridden to >=5.0.5 via pnpm.overrides |

## CI Enforcement

The CI pipeline (`ci.yml`) runs `pnpm audit --audit-level=high` after every dependency install. Any new high or critical advisory fails the build and blocks deployment — unless it is on `pnpm.auditConfig.ignoreGhsas`, which per the policy above requires a documented Accepted Risk entry in this file.

# Rename runbook — product name and domain

The "Suno" in SunoFlow is another company's trademark, so the product name and the
domain are expected to move. Everything user-visible reads from a constant, so the
rename is a config change plus a redeploy — not a sweep through 100 files.

## Where the brand lives

| Surface | Source | Notes |
| --- | --- | --- |
| Web name | `src/lib/branding.ts` → `APP_NAME` | `NEXT_PUBLIC_APP_NAME`, default `SunoFlow` |
| Web origin | `src/lib/site-url.ts` → `getSiteUrl()`, re-exported as `APP_URL` | `NEXT_PUBLIC_SITE_URL` |
| Bare host / contact | `APP_DOMAIN`, `CONTACT_EMAIL` | derived from `APP_URL` |
| Mobile name + origin | `apps/mobile/src/branding.ts` | `EXPO_PUBLIC_APP_NAME`, `EXPO_PUBLIC_SUNOFLOW_BASE_URL` |
| Native app name | `apps/mobile/app.json` → `expo.name` | read by the native build before any JS runs, so it cannot be a constant |

Both `NEXT_PUBLIC_*` vars are declared as `ARG`/`ENV` in the Dockerfile. That is not
decoration: Next.js inlines `NEXT_PUBLIC_*` during `next build`, and Railway only
forwards service variables into a Docker build when the Dockerfile declares them.
A variable set on the service but missing from the Dockerfile is silently ignored —
`NEXT_PUBLIC_SITE_URL` was in exactly that state until 2026-08-11.

## What NOT to rename

**The iOS bundle identifier `app.sunoflow.mobile`** stays, whatever the product ends
up being called. It is invisible to users, but it *is* the app's identity: iOS
refuses to update an installed app across a changed `application-identifier`
(`CommandError: MismatchedApplicationIdentifierEntitlement`), so a change forces a
delete-and-reinstall on every device — losing the stored session — and cuts the
TestFlight build history. Bundle ids are also globally unique across Apple teams, so
the old one cannot be reclaimed later.

## Doing the rename

1. Register the new domain and point it at the Railway service; keep the old one
   redirecting so shared song and playlist links survive.
2. Set `NEXT_PUBLIC_APP_NAME` and `NEXT_PUBLIC_SITE_URL` on the Railway service,
   then redeploy — a build, not a restart, since the values are inlined.
3. Mobile: set `EXPO_PUBLIC_APP_NAME` and `EXPO_PUBLIC_SUNOFLOW_BASE_URL` in
   `apps/mobile/.env`, change `expo.name` in `app.json`, rebuild and upload via
   `pnpm testflight`.
4. Rename the App Store Connect record (allowed while the app is unreleased).
5. Sweep the leftovers a constant cannot reach: icons and OG artwork that draw the
   wordmark, the `README`, `.ytstack/` history (leave it — it is a record of what
   was true then), and any external listing (GitHub description, marketplace).
6. Verify: `grep -rn "SunoFlow" src apps/mobile/src apps/mobile/app` should return
   only comments and test fixtures.

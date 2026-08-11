import { getSiteUrl } from "@/lib/site-url";

// Single source for the product's NAME. The origin already had one —
// getSiteUrl() / NEXT_PUBLIC_SITE_URL — and is only re-exported here so callers
// have one import for both halves of the brand.
//
// Both are expected to change: the "Suno" in SunoFlow is another company's mark,
// so the name and the domain will move. Nothing user-visible may hardcode either
// — import APP_NAME / APP_URL instead, in metadata, copy and share strings
// alike, so the rename is a config change rather than a 100-file sweep.
//
// NEXT_PUBLIC_* is inlined at build time. On Railway that only works when the
// variable is also declared as an ARG in the Dockerfile — an env var set on the
// service alone never reaches a Docker build. Both are declared there.
//
// Deliberately NOT parameterized: the iOS bundle identifier
// (apps/mobile/app.json). It is invisible to users but IS the app's identity;
// changing it forces a delete-and-reinstall on every device and cuts the
// TestFlight history.

/** Product name as shown to users. */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "SunoFlow";

/** Canonical public origin, no trailing slash. */
export const APP_URL = getSiteUrl().replace(/\/$/, "");

/** Bare host, for places that display the domain rather than link to it. */
export const APP_DOMAIN = APP_URL.replace(/^https?:\/\//, "");

/** Public contact address. Follows the domain, so a move renames it too. */
export const CONTACT_EMAIL = `hello@${APP_DOMAIN}`;

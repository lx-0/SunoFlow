/** How long a freshly-fetched Suno CDN URL is valid for. */
export const CDN_URL_TTL_MS = 12 * 24 * 60 * 60 * 1000;

/**
 * Treat a CDN URL as stale (and proactively refresh it) when it expires
 * within this window.
 */
export const CDN_REFRESH_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

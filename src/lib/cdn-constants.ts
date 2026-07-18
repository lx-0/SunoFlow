/** How long a freshly-fetched Suno CDN URL is valid for. */
export const CDN_URL_TTL_MS = 12 * 24 * 60 * 60 * 1000;

/**
 * Treat a CDN URL as stale (and proactively refresh it) when it expires
 * within this window.
 */
export const CDN_REFRESH_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Suno's permanent per-clip CDN host (the base of `sunoCdnAudioUrl` in
 * sunoapi/mappers.ts). Aggregator hosts (tempfile.*) expire their files;
 * this one does not.
 */
export const PERMANENT_CDN_HOST = "cdn1.suno.ai";

/**
 * True when a stored CDN URL lives on the permanent host. Permanent URLs
 * never expire: freshness checks must skip the aggregator pre-refresh
 * regardless of `audioUrlExpiresAt`, and heals that write one stamp the
 * expiry as null ("permanent") instead of now + CDN_URL_TTL_MS.
 */
export function isPermanentCdnUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname === PERMANENT_CDN_HOST;
  } catch {
    return false;
  }
}

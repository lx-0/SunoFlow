const DEFAULT_SITE_URL = "https://sunoflow.app";

/**
 * Shared canonical site URL used for metadata, sitemap, and robots.
 *
 * A trailing slash is stripped: callers append paths directly
 * (`${getSiteUrl()}/icons/icon-512.png`), so a hand-typed "https://example.com/"
 * in the environment would otherwise produce double slashes in every OG image
 * URL and sitemap entry.
 */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, "");
}

export function getSiteUrlObject(): URL {
  return new URL(getSiteUrl());
}


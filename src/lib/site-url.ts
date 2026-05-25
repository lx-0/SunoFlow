const DEFAULT_SITE_URL = "https://sunoflow.app";

/**
 * Shared canonical site URL used for metadata, sitemap, and robots.
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;
}

export function getSiteUrlObject(): URL {
  return new URL(getSiteUrl());
}


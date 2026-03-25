/**
 * Analytics module — wraps PostHog for event tracking.
 *
 * Rules:
 * - Only initializes when NEXT_PUBLIC_POSTHOG_KEY is set (production gating)
 * - No PII: never include email, name, or user ID in event properties
 * - All calls are fire-and-forget; never await analytics
 */

import posthog from "posthog-js";

let initialized = false;

export function initAnalytics() {
  if (initialized) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  if (!key) return;

  posthog.init(key, {
    api_host: host,
    // Use localStorage persistence (no cookies) — avoids cookie consent requirement
    persistence: "localStorage",
    // Disable automatic session recording to keep payload minimal
    disable_session_recording: true,
    // Capture page views manually via PostHogPageView
    capture_pageview: false,
    // Respect Do Not Track header
    respect_dnt: true,
  });

  initialized = true;
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function pageView(url: string) {
  if (!initialized) return;
  posthog.capture("$pageview", { $current_url: url });
}

/**
 * Client-side error reporter. All callers in this repo are "use client"
 * error.tsx boundaries — see grep across src/app/**\/error.tsx.
 *
 * Three side-effects:
 *   1. console.error so it's visible to the developer
 *   2. POST to /api/error-report so the server gets a structured record
 *   3. Sentry.captureException so it lands in GlitchTip
 *
 * Each branch swallows its own errors — a broken Sentry SDK must not
 * stop console.error from firing.
 */
"use client";

import * as Sentry from "@sentry/nextjs";
import { extractErrorInfo } from "./extract";

function reportToServer(source: string, error: unknown, route?: string): void {
  const { message, stack } = extractErrorInfo(error);
  fetch("/api/error-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      stack,
      url: route ?? window.location.href,
      userAgent: navigator.userAgent,
      source,
    }),
  }).catch(() => {
    // Silently fail — we already logged to console
  });
}

export function logError(source: string, error: unknown, route?: string): void {
  const { message, stack } = extractErrorInfo(error);
  const entry = {
    source,
    route: route ?? window.location.pathname,
    error: stack ? { message, stack } : message,
  };

  console.error("[SunoFlow Error]", entry);
  reportToServer(source, error, route);
  try {
    Sentry.captureException(
      error instanceof Error ? error : new Error(String(error)),
      {
        tags: { source },
        extra: { route: entry.route },
      },
    );
  } catch {
    // Keep runtime patrol non-fatal even if telemetry SDK throws.
  }
}

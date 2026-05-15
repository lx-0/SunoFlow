/**
 * Structured error logger.
 *
 * Server-side calls go through pino (JSON to stdout).
 * Client-side calls fall back to window.fetch → /api/error-report + Sentry.captureException().
 */
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";

function extractErrorInfo(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack?.slice(0, 2048) };
  }
  return { message: String(error) };
}

function reportToServer(source: string, error: unknown, route?: string): void {
  if (typeof window === "undefined") return;

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

export function logError(
  source: string,
  error: unknown,
  route?: string
): void {
  const { message, stack } = extractErrorInfo(error);

  const entry = {
    source,
    route: route ?? (typeof window !== "undefined" ? window.location.pathname : "unknown"),
    error: stack ? { message, stack } : message,
  };

  // Server-side: structured pino log; client-side: console fallback + report + Sentry
  if (typeof window === "undefined") {
    logger.error(entry, "client-error");
  } else {
    console.error("[SunoFlow Error]", entry);
    reportToServer(source, error, route);
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { source },
      extra: { route: entry.route },
    });
  }
}

// Keys in `params` that are auto-promoted to Sentry tags so the value is
// searchable in the GlitchTip UI (issue list, filter, list_issues MCP).
// Tag values have a ~200-char limit and a per-event tag count limit, so this
// list is intentionally small and stable. Other params still ride in `extra`.
const INDEXED_PARAM_KEYS = ["songId", "sunoJobId", "playlistId", "stemId", "feedId"] as const;

function promoteParamsToTags(
  params: Record<string, unknown> | undefined,
): Record<string, string> {
  if (!params) return {};
  const tags: Record<string, string> = {};
  for (const key of INDEXED_PARAM_KEYS) {
    const v = params[key];
    if (typeof v === "string" && v.length > 0 && v.length <= 200) {
      tags[key] = v;
    }
  }
  return tags;
}

/**
 * Structured server-side error logger with request context.
 * Generates a correlation ID for each log entry to aid debugging.
 * Use in API routes to log errors with userId and request parameters.
 *
 * @returns The correlation ID for this log entry (include in error responses for traceability).
 */
export function logServerError(
  source: string,
  error: unknown,
  context: {
    userId?: string;
    route: string;
    params?: Record<string, unknown>;
    correlationId?: string;
    tags?: Record<string, string | undefined>;
  }
): string {
  const correlationId =
    context.correlationId ??
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  logger.error(
    {
      correlationId,
      source,
      route: context.route,
      userId: context.userId ?? "unknown",
      params: context.params ?? {},
      err: error instanceof Error ? error : new Error(String(error)),
    },
    "server-error"
  );

  const tags: Record<string, string> = {
    source,
    route: context.route,
    ...(context.userId ? { userId: context.userId } : {}),
    ...promoteParamsToTags(context.params),
  };
  if (context.tags) {
    for (const [k, v] of Object.entries(context.tags)) {
      if (typeof v === "string" && v.length > 0 && v.length <= 200) tags[k] = v;
    }
  }

  // Mirror to Sentry/GlitchTip so server-side errors are visible alongside
  // their client-side counterparts. Sentry.init is a no-op without a DSN, so
  // captureException is also a no-op when tracking is disabled.
  Sentry.captureException(
    error instanceof Error ? error : new Error(String(error)),
    {
      tags,
      extra: {
        correlationId,
        userId: context.userId ?? "unknown",
        params: context.params ?? {},
      },
    },
  );

  return correlationId;
}

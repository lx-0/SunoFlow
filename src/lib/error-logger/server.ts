/**
 * Server-side error logger with request context. Generates a correlation
 * ID so a single error can be cross-referenced between pino logs (Railway
 * stdout) and Sentry/GlitchTip events.
 *
 * The `params` field carries arbitrary context; a fixed allowlist of
 * indexable keys (songId, sunoJobId, …) is auto-promoted to Sentry tags
 * so the value is searchable from the GlitchTip issue list and via the
 * MCP `list_issues` query API.
 */
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { extractErrorInfo } from "./extract";

// Re-exported so existing call sites that previously imported from
// `@/lib/error-logger` keep working unchanged via the barrel.
export { extractErrorInfo };

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
 * @returns The correlation ID for this log entry (include in error
 * responses for traceability).
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
  },
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
    "server-error",
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

/**
 * Structured error logger.
 * Logs errors to the console and reports them to /api/error-report.
 */

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
    timestamp: new Date().toISOString(),
    source,
    route: route ?? (typeof window !== "undefined" ? window.location.pathname : "unknown"),
    error: stack ? { message, stack } : message,
  };

  console.error("[SunoFlow Error]", JSON.stringify(entry, null, 2));

  reportToServer(source, error, route);
}

/**
 * Structured server-side error logger with request context.
 * Use in API routes to log errors with userId and request parameters.
 */
export function logServerError(
  source: string,
  error: unknown,
  context: {
    userId?: string;
    route: string;
    params?: Record<string, unknown>;
  }
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    source,
    route: context.route,
    userId: context.userId ?? "unknown",
    params: context.params ?? {},
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : String(error),
  };

  console.error("[SunoFlow ServerError]", JSON.stringify(entry, null, 2));
}

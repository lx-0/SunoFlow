/**
 * Structured JSON logger backed by pino.
 * Use this everywhere instead of console.log / console.error.
 *
 * Output format (one JSON object per line):
 *   { "level": 30, "time": 1234567890, "msg": "...", "correlationId": "...", ... }
 *
 * Log levels: trace=10, debug=20, info=30, warn=40, error=50, fatal=60
 */
import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  base: {
    service: "sunoflow",
    env: process.env.NODE_ENV ?? "production",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // In development, pretty-print if LOG_PRETTY=true; production always uses JSON
  ...(isDev && process.env.LOG_PRETTY === "true"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }
    : {}),
});

/**
 * Create a child logger with bound context fields.
 * Use for request-scoped logging where you want correlationId / userId
 * propagated automatically.
 *
 * @example
 *   const reqLogger = childLogger({ correlationId, userId, route: "/api/songs" });
 *   reqLogger.info("song created");
 */
export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}

export type Logger = ReturnType<typeof childLogger>;

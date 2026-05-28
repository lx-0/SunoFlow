/**
 * Per-API-key rate limiter for the MCP HTTP endpoint.
 *
 * In-memory sliding-window keyed by sha256(apiKey). Default 60 req/min,
 * override via `MCP_RATE_LIMIT_RPM` env var.
 *
 * Single-instance limitation: a multi-replica Railway deploy would split
 * the counter across pods. SunoFlow currently runs single-instance so this
 * is correct; if scaled, replace with Redis ZADD + ZREMRANGEBYSCORE (same
 * pattern as `src/lib/rate-limit/sliding-window.ts`).
 *
 * Key is the API-key hash, not the userId — that way a leaked key is
 * throttled independently of the user's other API keys.
 */

import { createHash } from "node:crypto";

const WINDOW_MS = 60 * 1000;
const MAX_KEYS = 50_000;

const hits = new Map<string, number[]>();

function rpm(): number {
  const raw = process.env.MCP_RATE_LIMIT_RPM;
  if (!raw) return 60;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
}

function keyFor(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export function checkMcpRateLimit(apiKey: string): RateLimitResult {
  const max = rpm();
  const key = keyFor(apiKey);
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const entry = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (entry.length >= max) {
    const oldest = entry[0];
    const retryAfterMs = oldest + WINDOW_MS - now;
    return {
      allowed: false,
      limit: max,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  entry.push(now);
  hits.set(key, entry);

  // Periodic eviction
  if (hits.size > MAX_KEYS) {
    hits.forEach((ts, k) => {
      const recent = ts.filter((t) => t > windowStart);
      if (recent.length === 0) hits.delete(k);
      else hits.set(k, recent);
    });
  }

  return {
    allowed: true,
    limit: max,
    remaining: Math.max(0, max - entry.length),
    retryAfterSec: 0,
  };
}

/** Reset internal store — for tests only. */
export function _resetMcpRateLimit(): void {
  hits.clear();
}

import type { NextResponse } from "next/server";
import { acquireRateLimitSlot, type RateLimitStatus } from "./db";
import { rateLimited } from "@/lib/api-error";

type RateLimitOk = { ok: true; status: RateLimitStatus };
type RateLimitDenied = { ok: false; response: NextResponse };

/**
 * Acquire a rate-limit slot and return a denial response if the limit is
 * already exceeded.  Centralises the acquire → 429 pattern so individual
 * route handlers never need to hand-roll Retry-After / X-RateLimit-* headers.
 *
 * @example
 * const rl = await rateLimitCheck(auth.userId, "generate");
 * if (!rl.ok) return rl.response;
 */
export async function rateLimitCheck(
  userId: string,
  action?: string,
  limit?: number,
): Promise<RateLimitOk | RateLimitDenied> {
  const { acquired, status } = await acquireRateLimitSlot(userId, action, limit);
  if (!acquired) {
    return {
      ok: false,
      response: rateLimited(
        `Rate limit exceeded. You can perform up to ${status.limit} requests per hour.`,
        { rateLimit: status },
      ),
    };
  }
  return { ok: true, status };
}

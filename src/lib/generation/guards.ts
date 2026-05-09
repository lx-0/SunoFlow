import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { acquireRateLimitSlot, releaseRateLimitSlot, type RateLimitStatus } from "@/lib/rate-limit";
import { rateLimited, insufficientCredits } from "@/lib/api-error";
import { checkCredits } from "@/lib/credits";
import { logger } from "@/lib/logger";

export { releaseRateLimitSlot } from "@/lib/rate-limit";
export type { RateLimitStatus } from "@/lib/rate-limit";

export type GuardPolicy =
  | "standard"
  | "free"
  | "admin"
  | "personal-key"
  | "pre-authorized";

export interface GuardFlags {
  rateLimit: boolean;
  creditCheck: boolean;
  creditRecording: boolean;
}

export function resolveGuards(policy: GuardPolicy): GuardFlags {
  switch (policy) {
    case "standard":       return { rateLimit: true,  creditCheck: true,  creditRecording: true };
    case "free":           return { rateLimit: true,  creditCheck: false, creditRecording: false };
    case "admin":          return { rateLimit: false, creditCheck: true,  creditRecording: true };
    case "personal-key":   return { rateLimit: false, creditCheck: false, creditRecording: false };
    case "pre-authorized": return { rateLimit: false, creditCheck: false, creditRecording: true };
  }
}

export type RateLimitResult =
  | { limited: true; response: NextResponse }
  | { limited: false; status: RateLimitStatus };

export async function enforceRateLimit(
  userId: string,
  action = "generate"
): Promise<RateLimitResult> {
  const { acquired, status } = await acquireRateLimitSlot(userId, action);
  if (acquired) {
    return { limited: false, status };
  }

  const retryAfterSec = Math.max(
    1,
    Math.ceil((new Date(status.resetAt).getTime() - Date.now()) / 1000)
  );

  logger.warn(
    { userId, action, limit: status.limit, resetAt: status.resetAt },
    "rate-limit: generation limit exceeded"
  );
  Sentry.addBreadcrumb({
    category: "rate-limit",
    message: "Generation rate limit exceeded",
    level: "warning",
    data: { userId, action, limit: status.limit, resetAt: status.resetAt },
  });

  return {
    limited: true,
    response: rateLimited(
      `Rate limit exceeded. You can generate up to ${status.limit} songs per hour.`,
      { resetAt: status.resetAt, rateLimit: status },
      { "Retry-After": String(retryAfterSec) }
    ),
  };
}

export async function checkCreditBalance(
  userId: string,
  action: string
): Promise<{ denied: NextResponse } | { ok: true }> {
  const result = await checkCredits(userId, action);
  if (!result.ok) {
    return {
      denied: insufficientCredits(
        `Insufficient credits. You need ${result.creditCost} credits but only have ${result.creditsRemaining} remaining.`
      ),
    };
  }
  return { ok: true };
}

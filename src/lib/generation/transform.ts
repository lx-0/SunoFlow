import type { RateLimitStatus } from "@/lib/rate-limit";
import { releaseRateLimitSlot } from "@/lib/rate-limit";
import { resolveGuards, enforceRateLimit, checkCreditBalance, type GuardPolicy } from "./guards";
import { userFriendlyError } from "./errors";

export interface TransformSpec {
  userId: string;
  action: string;
  apiCall: () => Promise<{ taskId: string }>;
  hasApiKey: boolean;
  mockTaskId: string;
  fallbackErrorMessage?: string;
  guards?: GuardPolicy;
}

export type TransformOutcome =
  | { status: "denied"; response: Response }
  | { status: "completed"; taskId: string; mockMode: boolean; rateLimitStatus?: RateLimitStatus }
  | { status: "failed"; error: string; rawError: unknown; rateLimitStatus?: RateLimitStatus };

export async function executeTransform(spec: TransformSpec): Promise<TransformOutcome> {
  const guards = resolveGuards(spec.guards ?? "free");
  let rateLimitStatus: RateLimitStatus | undefined;

  if (guards.rateLimit) {
    const result = await enforceRateLimit(spec.userId, spec.action);
    if (result.limited) return { status: "denied", response: result.response };
    rateLimitStatus = result.status;
  }

  if (guards.creditCheck) {
    const result = await checkCreditBalance(spec.userId, spec.action);
    if ("denied" in result) return { status: "denied", response: result.denied };
  }

  if (!spec.hasApiKey) {
    return { status: "completed", taskId: spec.mockTaskId, mockMode: true, rateLimitStatus };
  }

  try {
    const result = await spec.apiCall();
    return { status: "completed", taskId: result.taskId, mockMode: false, rateLimitStatus };
  } catch (apiError) {
    if (guards.rateLimit) {
      await releaseRateLimitSlot(spec.userId).catch(() => {});
    }
    const { message: errorMsg } = userFriendlyError(apiError, spec.fallbackErrorMessage);
    return { status: "failed", error: errorMsg, rawError: apiError, rateLimitStatus };
  }
}

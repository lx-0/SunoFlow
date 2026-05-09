import { notifyLowCreditsIfNeeded } from "@/lib/notifications";
import { analyzeUsage, getCreditCost } from "./calculate";
import {
  getTopUpCreditsRemaining,
  getSubscriptionBudget,
  fetchMonthlyUsage,
  recordCreditUsage,
} from "./queries";
import type { MonthlyCreditUsage, CreditCheckResult } from "./constants";

// --- Barrel re-exports (preserve all existing import paths) ---

export {
  CREDIT_COSTS,
  DEFAULT_MONTHLY_BUDGET,
  LOW_CREDIT_THRESHOLD,
  GRACE_PERIOD_CUTOFF,
  GRACE_PERIOD_DAYS,
} from "./constants";
export type { MonthlyCreditUsage, CreditCheckResult } from "./constants";
export { getCreditCost } from "./calculate";
export { recordCreditUsage } from "./queries";

// --- Orchestration ---

export async function getMonthlyCreditUsage(userId: string): Promise<MonthlyCreditUsage> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [subscriptionBudget, topUpCredits, raw] = await Promise.all([
    getSubscriptionBudget(userId),
    getTopUpCreditsRemaining(userId),
    fetchMonthlyUsage(userId, startOfMonth),
  ]);

  return analyzeUsage(subscriptionBudget, topUpCredits, raw, now);
}

export async function checkCredits(
  userId: string,
  action: string
): Promise<CreditCheckResult> {
  const creditCost = getCreditCost(action);
  const usage = await getMonthlyCreditUsage(userId);
  return {
    ok: usage.creditsRemaining >= creditCost,
    creditCost,
    creditsRemaining: usage.creditsRemaining,
  };
}

export async function deductCredits(
  userId: string,
  action: string,
  opts?: { songId?: string; description?: string }
): Promise<void> {
  const creditCost = getCreditCost(action);
  await recordCreditUsage(userId, action, {
    creditCost,
    songId: opts?.songId,
    description: opts?.description,
  });

  try {
    const usage = await getMonthlyCreditUsage(userId);
    await notifyLowCreditsIfNeeded(userId, usage);
  } catch {
    // Non-critical — don't block the caller
  }
}

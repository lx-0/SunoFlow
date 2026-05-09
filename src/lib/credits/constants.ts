export const CREDIT_COSTS: Record<string, number> = {
  generate: 10,
  extend: 10,
  cover: 10,
  mashup: 10,
  lyrics: 2,
  style_boost: 5,
};

export const DEFAULT_MONTHLY_BUDGET = 500;

export const LOW_CREDIT_THRESHOLD = 0.2;

export const GRACE_PERIOD_CUTOFF = new Date("2026-03-25T00:00:00Z");
export const GRACE_PERIOD_DAYS = 30;

export interface MonthlyCreditUsage {
  budget: number;
  subscriptionBudget: number;
  topUpCredits: number;
  topUpCreditsRemaining: number;
  subscriptionCreditsRemaining: number;
  creditsUsedThisMonth: number;
  creditsRemaining: number;
  generationsThisMonth: number;
  usagePercent: number;
  isLow: boolean;
  totalCreditsAllTime: number;
  totalGenerationsAllTime: number;
  dailyChart: Array<{ date: string; credits: number; count: number }>;
}

export type CreditCheckResult =
  | { ok: true; creditCost: number; creditsRemaining: number }
  | { ok: false; creditCost: number; creditsRemaining: number };

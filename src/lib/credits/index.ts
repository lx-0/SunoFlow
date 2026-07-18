import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { TIER_LIMITS } from "@/lib/billing";
import { notifyLowCreditsIfNeeded } from "@/lib/notifications";

// --- Constants ---

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

// --- Types ---

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

export interface RawMonthlyUsage {
  monthlyCredits: number;
  monthlyCount: number;
  allTimeCredits: number;
  allTimeCount: number;
  dailyBreakdown: Array<{ date: string; credits: bigint; count: bigint }>;
}

export interface TopUpPool {
  /** SUM(credits) over unexpired top-ups (gross purchased). */
  purchased: number;
  /** SUM(credits - consumedCredits) over unexpired top-ups — the lifetime net pool. */
  remaining: number;
}

export interface TopUpDebit {
  id: string;
  amount: number;
  /** Highest consumedCredits value the row may hold for this debit to still fit. */
  guardMax: number;
}

// --- Pure calculations ---

export function buildDailyChart(
  dailyBreakdown: Array<{ date: string; credits: bigint; count: bigint }>,
  now: Date
): Array<{ date: string; credits: number; count: number }> {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const chart: Array<{ date: string; credits: number; count: number }> = [];

  for (let d = 1; d <= Math.min(now.getDate(), daysInMonth); d++) {
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const match = dailyBreakdown.find(
      (r) => new Date(r.date).toISOString().slice(0, 10) === dateStr
    );
    chart.push({
      date: dateStr,
      credits: match ? Number(match.credits) : 0,
      count: match ? Number(match.count) : 0,
    });
  }

  return chart;
}

export function analyzeUsage(
  subscriptionBudget: number,
  topUpPool: TopUpPool,
  raw: RawMonthlyUsage,
  now: Date
): MonthlyCreditUsage {
  const creditsUsedThisMonth = raw.monthlyCredits;

  // Two pools: the subscription allowance resets with the calendar month; the
  // top-up pool is lifetime and only shrinks (consumedCredits is debited FIFO
  // at spend time and never resets — see deductCredits).
  const subscriptionCreditsRemaining = Math.max(0, subscriptionBudget - creditsUsedThisMonth);
  const topUpCreditsRemaining = topUpPool.remaining;
  const creditsRemaining = subscriptionCreditsRemaining + topUpCreditsRemaining;

  // budget = the currently claimable ceiling (this month's allowance + live
  // top-up pool), so "creditsRemaining out of budget" stays coherent across
  // month boundaries even after top-ups were partially consumed.
  const budget = subscriptionBudget + topUpCreditsRemaining;
  const usagePercent = budget > 0 ? (budget - creditsRemaining) / budget : 0;
  const isLow = usagePercent >= 1 - LOW_CREDIT_THRESHOLD;

  return {
    budget,
    subscriptionBudget,
    topUpCredits: topUpPool.purchased,
    topUpCreditsRemaining,
    subscriptionCreditsRemaining,
    creditsUsedThisMonth,
    creditsRemaining,
    generationsThisMonth: raw.monthlyCount,
    usagePercent: Math.round(usagePercent * 100),
    isLow,
    totalCreditsAllTime: raw.allTimeCredits,
    totalGenerationsAllTime: raw.allTimeCount,
    dailyChart: buildDailyChart(raw.dailyBreakdown, now),
  };
}

export function getCreditCost(action: string): number {
  return CREDIT_COSTS[action] ?? CREDIT_COSTS.generate;
}

/**
 * How much of THIS spend must be drawn from the top-up pool: the growth of the
 * month's subscription overflow caused by this spend. Earlier overflow was
 * already debited at its own spend time, so only the delta is charged here.
 */
export function computeTopUpDebit(
  creditCost: number,
  monthlyUsedAfter: number,
  subscriptionBudget: number
): number {
  const overflowAfter = Math.max(0, monthlyUsedAfter - subscriptionBudget);
  const overflowBefore = Math.max(0, monthlyUsedAfter - creditCost - subscriptionBudget);
  return overflowAfter - overflowBefore;
}

/**
 * Plan FIFO debits across top-up rows (caller orders them earliest-expiring
 * first). Each debit is capped at the row's unconsumed remainder; guardMax
 * carries the conditional-update bound that prevents over-debit under
 * concurrency (row is only debited while consumedCredits <= guardMax).
 */
export function planTopUpDebits(
  topUps: Array<{ id: string; credits: number; consumedCredits: number }>,
  amount: number
): TopUpDebit[] {
  const debits: TopUpDebit[] = [];
  let remaining = amount;

  for (const topUp of topUps) {
    if (remaining <= 0) break;
    const available = topUp.credits - topUp.consumedCredits;
    if (available <= 0) continue;
    const take = Math.min(available, remaining);
    debits.push({ id: topUp.id, amount: take, guardMax: topUp.credits - take });
    remaining -= take;
  }

  return debits;
}

// --- Data access ---

export async function recordCreditUsage(
  userId: string,
  action: string,
  opts?: { songId?: string; creditCost?: number; description?: string }
) {
  const cost = opts?.creditCost ?? CREDIT_COSTS[action] ?? 0;
  const record = await prisma.creditUsage.create({
    data: {
      userId,
      action,
      creditCost: cost,
      songId: opts?.songId,
      description: opts?.description,
    },
  });
  logger.info(
    { userId, action, creditCost: cost, songId: opts?.songId ?? null },
    "credits: usage recorded"
  );
  return record;
}

type DbClient = Prisma.TransactionClient;

async function getTopUpPool(userId: string): Promise<TopUpPool> {
  const now = new Date();
  const result = await prisma.creditTopUp.aggregate({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    _sum: { credits: true, consumedCredits: true },
  });
  const purchased = result._sum.credits ?? 0;
  const consumed = result._sum.consumedCredits ?? 0;
  return { purchased, remaining: Math.max(0, purchased - consumed) };
}

async function getSubscriptionBudget(userId: string, db: DbClient = prisma): Promise<number> {
  const gracePeriodEnd = new Date(
    GRACE_PERIOD_CUTOFF.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
  );

  if (new Date() < gracePeriodEnd) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    if (user && user.createdAt < GRACE_PERIOD_CUTOFF) {
      return DEFAULT_MONTHLY_BUDGET;
    }
  }

  const sub = await db.subscription.findUnique({
    where: { userId },
    select: { tier: true, status: true },
  });

  if (!sub || sub.status !== "active") {
    return TIER_LIMITS.free.creditsPerMonth;
  }

  return TIER_LIMITS[sub.tier].creditsPerMonth;
}

async function fetchMonthlyUsage(
  userId: string,
  startOfMonth: Date
): Promise<RawMonthlyUsage> {
  const [monthlyUsage, totalAllTime, dailyBreakdown] = await Promise.all([
    prisma.creditUsage.aggregate({
      where: { userId, createdAt: { gte: startOfMonth } },
      _sum: { creditCost: true },
      _count: true,
    }),
    prisma.creditUsage.aggregate({
      where: { userId },
      _sum: { creditCost: true },
      _count: true,
    }),
    prisma.$queryRaw<Array<{ date: string; credits: bigint; count: bigint }>>`
      SELECT DATE("createdAt") as date,
             SUM("creditCost")::bigint as credits,
             COUNT(*)::bigint as count
      FROM "CreditUsage"
      WHERE "userId" = ${userId}
        AND "createdAt" >= ${startOfMonth}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
  ]);

  return {
    monthlyCredits: monthlyUsage._sum.creditCost ?? 0,
    monthlyCount: monthlyUsage._count,
    allTimeCredits: totalAllTime._sum.creditCost ?? 0,
    allTimeCount: totalAllTime._count,
    dailyBreakdown,
  };
}

// --- Orchestration ---

export async function getMonthlyCreditUsage(userId: string): Promise<MonthlyCreditUsage> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [subscriptionBudget, topUpPool, raw] = await Promise.all([
    getSubscriptionBudget(userId),
    getTopUpPool(userId),
    fetchMonthlyUsage(userId, startOfMonth),
  ]);

  return analyzeUsage(subscriptionBudget, topUpPool, raw, now);
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

async function debitTopUpsFifo(
  tx: DbClient,
  userId: string,
  amount: number,
  now: Date
): Promise<void> {
  const topUps = await tx.creditTopUp.findMany({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ expiresAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    select: { id: true, credits: true, consumedCredits: true },
  });

  let undebited = amount;
  for (const debit of planTopUpDebits(topUps, amount)) {
    // Conditional debit: only applies while the row still has room for this
    // amount, so concurrent spends can never drive consumedCredits > credits.
    const result = await tx.creditTopUp.updateMany({
      where: { id: debit.id, consumedCredits: { lte: debit.guardMax } },
      data: { consumedCredits: { increment: debit.amount } },
    });
    if (result.count === 1) {
      undebited -= debit.amount;
    }
  }

  if (undebited > 0) {
    // A concurrent spend consumed part of the planned rows between the read
    // and the conditional update, or the pool is exhausted. Never over-debit;
    // the shortfall favors the user and the checkCredits gate still blocks
    // once both pools are drained.
    logger.warn(
      { userId, amount, undebited },
      "credits: top-up debit shortfall (concurrent spend or drained pool)"
    );
  }
}

export async function deductCredits(
  userId: string,
  action: string,
  opts?: { songId?: string; description?: string }
): Promise<void> {
  const creditCost = getCreditCost(action);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  await prisma.$transaction(async (tx) => {
    await tx.creditUsage.create({
      data: {
        userId,
        action,
        creditCost,
        songId: opts?.songId,
        description: opts?.description,
      },
    });

    const [subscriptionBudget, monthly] = await Promise.all([
      getSubscriptionBudget(userId, tx),
      tx.creditUsage.aggregate({
        where: { userId, createdAt: { gte: startOfMonth } },
        _sum: { creditCost: true },
      }),
    ]);

    const debit = computeTopUpDebit(
      creditCost,
      monthly._sum.creditCost ?? 0,
      subscriptionBudget
    );
    if (debit > 0) {
      await debitTopUpsFifo(tx, userId, debit, now);
    }
  });

  logger.info(
    { userId, action, creditCost, songId: opts?.songId ?? null },
    "credits: usage recorded"
  );

  try {
    const usage = await getMonthlyCreditUsage(userId);
    await notifyLowCreditsIfNeeded(userId, usage);
  } catch {
    // Non-critical — don't block the caller
  }
}

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { TIER_LIMITS } from "@/lib/billing";
import {
  CREDIT_COSTS,
  DEFAULT_MONTHLY_BUDGET,
  GRACE_PERIOD_CUTOFF,
  GRACE_PERIOD_DAYS,
} from "./constants";
import { type RawMonthlyUsage } from "./calculate";

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

export async function getTopUpCreditsRemaining(userId: string): Promise<number> {
  const now = new Date();
  const result = await prisma.creditTopUp.aggregate({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    _sum: { credits: true },
  });
  return result._sum.credits ?? 0;
}

export async function getSubscriptionBudget(userId: string): Promise<number> {
  const gracePeriodEnd = new Date(
    GRACE_PERIOD_CUTOFF.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
  );

  if (new Date() < gracePeriodEnd) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    if (user && user.createdAt < GRACE_PERIOD_CUTOFF) {
      return DEFAULT_MONTHLY_BUDGET;
    }
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { tier: true, status: true },
  });

  if (!sub || sub.status !== "active") {
    return TIER_LIMITS.free.creditsPerMonth;
  }

  return TIER_LIMITS[sub.tier].creditsPerMonth;
}

export async function fetchMonthlyUsage(
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

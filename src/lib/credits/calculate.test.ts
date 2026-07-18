import { describe, it, expect } from "vitest";
import {
  analyzeUsage,
  buildDailyChart,
  getCreditCost,
  computeTopUpDebit,
  planTopUpDebits,
} from ".";
import type { RawMonthlyUsage, TopUpPool } from ".";

function pool(purchased: number, remaining = purchased): TopUpPool {
  return { purchased, remaining };
}

describe("getCreditCost", () => {
  it("returns the cost for known actions", () => {
    expect(getCreditCost("generate")).toBe(10);
    expect(getCreditCost("lyrics")).toBe(2);
    expect(getCreditCost("style_boost")).toBe(5);
  });

  it("falls back to generate cost for unknown actions", () => {
    expect(getCreditCost("unknown_action")).toBe(10);
  });
});

describe("buildDailyChart", () => {
  it("fills in zero-usage days", () => {
    const now = new Date("2026-03-05T12:00:00Z");
    const chart = buildDailyChart([], now);

    expect(chart).toHaveLength(5);
    expect(chart.every((d) => d.credits === 0 && d.count === 0)).toBe(true);
    expect(chart[0].date).toBe("2026-03-01");
    expect(chart[4].date).toBe("2026-03-05");
  });

  it("maps breakdown entries to correct dates", () => {
    const now = new Date("2026-03-03T12:00:00Z");
    const breakdown = [
      { date: "2026-03-02", credits: BigInt(20), count: BigInt(2) },
    ];
    const chart = buildDailyChart(breakdown, now);

    expect(chart).toHaveLength(3);
    expect(chart[0]).toEqual({ date: "2026-03-01", credits: 0, count: 0 });
    expect(chart[1]).toEqual({ date: "2026-03-02", credits: 20, count: 2 });
    expect(chart[2]).toEqual({ date: "2026-03-03", credits: 0, count: 0 });
  });
});

describe("analyzeUsage", () => {
  const baseRaw: RawMonthlyUsage = {
    monthlyCredits: 0,
    monthlyCount: 0,
    allTimeCredits: 0,
    allTimeCount: 0,
    dailyBreakdown: [],
  };
  const now = new Date("2026-03-15T12:00:00Z");

  it("computes budget as subscription + net top-up pool", () => {
    const usage = analyzeUsage(500, pool(100), baseRaw, now);
    expect(usage.budget).toBe(600);
    expect(usage.subscriptionBudget).toBe(500);
    expect(usage.topUpCredits).toBe(100);
  });

  it("budget uses the net pool, not the gross purchased sum", () => {
    const usage = analyzeUsage(500, pool(100, 40), baseRaw, now);
    expect(usage.budget).toBe(540);
    expect(usage.topUpCredits).toBe(100);
    expect(usage.topUpCreditsRemaining).toBe(40);
  });

  it("computes remaining credits correctly", () => {
    const raw = { ...baseRaw, monthlyCredits: 200, monthlyCount: 20 };
    const usage = analyzeUsage(500, pool(0), raw, now);

    expect(usage.creditsUsedThisMonth).toBe(200);
    expect(usage.creditsRemaining).toBe(300);
    expect(usage.generationsThisMonth).toBe(20);
  });

  it("clamps remaining to zero when over budget", () => {
    const raw = { ...baseRaw, monthlyCredits: 600 };
    const usage = analyzeUsage(500, pool(0), raw, now);

    expect(usage.creditsRemaining).toBe(0);
    expect(usage.usagePercent).toBe(100);
  });

  it("marks isLow when usage >= 80% of budget", () => {
    const raw80 = { ...baseRaw, monthlyCredits: 400 };
    expect(analyzeUsage(500, pool(0), raw80, now).isLow).toBe(true);

    const raw79 = { ...baseRaw, monthlyCredits: 395 };
    expect(analyzeUsage(500, pool(0), raw79, now).isLow).toBe(false);
  });

  it("splits remaining between subscription and top-up", () => {
    const raw = { ...baseRaw, monthlyCredits: 350 };
    const usage = analyzeUsage(500, pool(200), raw, now);

    expect(usage.subscriptionCreditsRemaining).toBe(150);
    expect(usage.topUpCreditsRemaining).toBe(200);
  });

  it("takes the top-up pool as-is — consumption is ledger-tracked, not derived", () => {
    // Monthly usage exceeding the subscription budget must NOT shrink the
    // reported top-up pool: the ledger already debited consumedCredits at
    // spend time and the caller passes the net remaining.
    const raw = { ...baseRaw, monthlyCredits: 600 };
    const usage = analyzeUsage(500, pool(200, 100), raw, now);

    expect(usage.subscriptionCreditsRemaining).toBe(0);
    expect(usage.topUpCreditsRemaining).toBe(100);
    expect(usage.creditsRemaining).toBe(100);
  });

  it("includes all-time stats", () => {
    const raw = { ...baseRaw, allTimeCredits: 5000, allTimeCount: 500 };
    const usage = analyzeUsage(500, pool(0), raw, now);

    expect(usage.totalCreditsAllTime).toBe(5000);
    expect(usage.totalGenerationsAllTime).toBe(500);
  });

  it("handles zero budget without division error", () => {
    const usage = analyzeUsage(0, pool(0), baseRaw, now);

    expect(usage.budget).toBe(0);
    expect(usage.usagePercent).toBe(0);
    expect(usage.isLow).toBe(false);
  });
});

describe("computeTopUpDebit", () => {
  it("returns 0 while the spend fits the subscription budget", () => {
    expect(computeTopUpDebit(10, 150, 200)).toBe(0);
    expect(computeTopUpDebit(10, 200, 200)).toBe(0);
  });

  it("charges only the overflow portion of a boundary-crossing spend", () => {
    // Used 205 after a 10-credit spend against a 200 budget → 5 from top-ups.
    expect(computeTopUpDebit(10, 205, 200)).toBe(5);
  });

  it("charges the full cost once the subscription is exhausted", () => {
    expect(computeTopUpDebit(10, 260, 200)).toBe(10);
  });

  it("charges nothing extra for earlier overflow (delta only)", () => {
    // Overflow before this spend was 50, after it 60 → only 10 now.
    expect(computeTopUpDebit(10, 260, 200)).toBe(10);
    expect(computeTopUpDebit(10, 210, 200)).toBe(10);
  });

  it("handles a zero-cost action", () => {
    expect(computeTopUpDebit(0, 260, 200)).toBe(0);
  });

  it("handles zero subscription budget", () => {
    expect(computeTopUpDebit(10, 10, 0)).toBe(10);
  });
});

describe("planTopUpDebits", () => {
  it("drains rows in the given (FIFO) order", () => {
    const debits = planTopUpDebits(
      [
        { id: "a", credits: 50, consumedCredits: 0 },
        { id: "b", credits: 50, consumedCredits: 0 },
      ],
      60
    );

    expect(debits).toEqual([
      { id: "a", amount: 50, guardMax: 0 },
      { id: "b", amount: 10, guardMax: 40 },
    ]);
  });

  it("caps each debit at the row's unconsumed remainder", () => {
    const debits = planTopUpDebits(
      [{ id: "a", credits: 100, consumedCredits: 95 }],
      10
    );

    expect(debits).toEqual([{ id: "a", amount: 5, guardMax: 95 }]);
  });

  it("skips fully consumed rows", () => {
    const debits = planTopUpDebits(
      [
        { id: "a", credits: 50, consumedCredits: 50 },
        { id: "b", credits: 50, consumedCredits: 0 },
      ],
      10
    );

    expect(debits).toEqual([{ id: "b", amount: 10, guardMax: 40 }]);
  });

  it("returns an empty plan for a zero amount or empty pool", () => {
    expect(planTopUpDebits([], 10)).toEqual([]);
    expect(planTopUpDebits([{ id: "a", credits: 50, consumedCredits: 0 }], 0)).toEqual([]);
  });
});

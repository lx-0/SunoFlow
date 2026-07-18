import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  get AUTH_SECRET() { return "test-secret"; },
  get NEXTAUTH_URL() { return "http://localhost:3000"; },
  get SUNOAPI_KEY() { return "test-key"; },
  get SUNO_API_TIMEOUT_MS() { return 30000; },
  get RATE_LIMIT_MAX_GENERATIONS() { return 10; },
  env: {},
}));

vi.mock("@/lib/billing", () => ({
  TIER_LIMITS: {
    free: { creditsPerMonth: 200, generationsPerHour: 5 },
    starter: { creditsPerMonth: 1500, generationsPerHour: 25 },
    pro: { creditsPerMonth: 5000, generationsPerHour: 50 },
    studio: { creditsPerMonth: 15000, generationsPerHour: 100 },
  },
}));

const mockCreditUsageCreate = vi.fn();
const mockCreditUsageAggregate = vi.fn();
const mockCreditTopUpAggregate = vi.fn();
const mockCreditTopUpFindMany = vi.fn();
const mockCreditTopUpUpdateMany = vi.fn();
const mockNotifyLowCreditsIfNeeded = vi.fn().mockResolvedValue(undefined);
const mockQueryRaw = vi.fn();
const mockUserFindUnique = vi.fn();
const mockSubscriptionFindUnique = vi.fn();

vi.mock("@/lib/notifications", () => ({
  notifyLowCreditsIfNeeded: (...args: unknown[]) => mockNotifyLowCreditsIfNeeded(...args),
}));

vi.mock("@/lib/prisma", () => {
  const prismaMock: Record<string, unknown> = {
    creditUsage: {
      create: (...args: unknown[]) => mockCreditUsageCreate(...args),
      aggregate: (...args: unknown[]) => mockCreditUsageAggregate(...args),
    },
    creditTopUp: {
      aggregate: (...args: unknown[]) => mockCreditTopUpAggregate(...args),
      findMany: (...args: unknown[]) => mockCreditTopUpFindMany(...args),
      updateMany: (...args: unknown[]) => mockCreditTopUpUpdateMany(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    subscription: {
      findUnique: (...args: unknown[]) => mockSubscriptionFindUnique(...args),
    },
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  };
  // Interactive transaction: run the callback against the same mock client.
  prismaMock.$transaction = (fn: (tx: unknown) => unknown) => fn(prismaMock);
  return { prisma: prismaMock };
});

import {
  CREDIT_COSTS,
  DEFAULT_MONTHLY_BUDGET,
  LOW_CREDIT_THRESHOLD,
  recordCreditUsage,
  getMonthlyCreditUsage,
  checkCredits,
  deductCredits,
  getCreditCost,
} from ".";

// Use fake timers within the grace period so getMonthlyBudget returns 500 for
// users created before the cutoff date.
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-26T12:00:00Z")); // within 30-day grace window
  // Default: user created before billing cutoff → grace budget = 500
  mockUserFindUnique.mockResolvedValue({ createdAt: new Date("2026-01-01") });
  // Default: no top-up credits
  mockCreditTopUpAggregate.mockResolvedValue({ _sum: { credits: 0, consumedCredits: 0 } });
  mockCreditTopUpFindMany.mockResolvedValue([]);
  mockCreditTopUpUpdateMany.mockResolvedValue({ count: 0 });
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Stateful ledger fake ──────────────────────────────────────────────
// Backs the FIFO-consumption tests with an in-memory CreditTopUp/CreditUsage
// store so month-boundary and concurrency behavior can be exercised
// end-to-end through deductCredits/getMonthlyCreditUsage.

interface FakeTopUpRow {
  id: string;
  credits: number;
  consumedCredits: number;
  expiresAt: Date | null;
  createdAt: Date;
}

let topUpRows: FakeTopUpRow[] = [];
let usageRows: Array<{ creditCost: number; createdAt: Date }> = [];

function unexpiredRows(): FakeTopUpRow[] {
  const now = new Date();
  return topUpRows.filter((r) => r.expiresAt === null || r.expiresAt > now);
}

function installLedgerFake() {
  topUpRows = [];
  usageRows = [];

  mockCreditUsageCreate.mockImplementation((args: { data: { creditCost: number } }) => {
    usageRows.push({ creditCost: args.data.creditCost, createdAt: new Date() });
    return Promise.resolve({ id: `cu-${usageRows.length}` });
  });

  mockCreditUsageAggregate.mockImplementation(
    (args: { where?: { createdAt?: { gte?: Date } } }) => {
      const gte = args?.where?.createdAt?.gte;
      const rows = gte ? usageRows.filter((r) => r.createdAt >= gte) : usageRows;
      return Promise.resolve({
        _sum: { creditCost: rows.reduce((s, r) => s + r.creditCost, 0) },
        _count: rows.length,
      });
    }
  );

  mockCreditTopUpAggregate.mockImplementation(() => {
    const rows = unexpiredRows();
    return Promise.resolve({
      _sum: {
        credits: rows.reduce((s, r) => s + r.credits, 0),
        consumedCredits: rows.reduce((s, r) => s + r.consumedCredits, 0),
      },
    });
  });

  mockCreditTopUpFindMany.mockImplementation(() => {
    // FIFO: expiresAt ASC NULLS LAST, createdAt ASC — mirrors debitTopUpsFifo.
    const rows = [...unexpiredRows()].sort((a, b) => {
      if (a.expiresAt === null && b.expiresAt === null)
        return a.createdAt.getTime() - b.createdAt.getTime();
      if (a.expiresAt === null) return 1;
      if (b.expiresAt === null) return -1;
      return (
        a.expiresAt.getTime() - b.expiresAt.getTime() ||
        a.createdAt.getTime() - b.createdAt.getTime()
      );
    });
    return Promise.resolve(
      rows.map((r) => ({ id: r.id, credits: r.credits, consumedCredits: r.consumedCredits }))
    );
  });

  mockCreditTopUpUpdateMany.mockImplementation(
    (args: {
      where: { id: string; consumedCredits: { lte: number } };
      data: { consumedCredits: { increment: number } };
    }) => {
      const row = topUpRows.find((r) => r.id === args.where.id);
      if (!row || row.consumedCredits > args.where.consumedCredits.lte) {
        return Promise.resolve({ count: 0 });
      }
      row.consumedCredits += args.data.consumedCredits.increment;
      return Promise.resolve({ count: 1 });
    }
  );

  mockQueryRaw.mockResolvedValue([]);
  mockSubscriptionFindUnique.mockResolvedValue(null); // free tier → budget 200
}

async function spend(total: number) {
  for (let i = 0; i < total / CREDIT_COSTS.generate; i++) {
    await deductCredits("user-1", "generate");
  }
}

describe("constants", () => {
  it("CREDIT_COSTS has expected values", () => {
    expect(CREDIT_COSTS.generate).toBe(10);
    expect(CREDIT_COSTS.extend).toBe(10);
    expect(CREDIT_COSTS.lyrics).toBe(2);
    expect(CREDIT_COSTS.style_boost).toBe(5);
  });

  it("DEFAULT_MONTHLY_BUDGET is 500", () => {
    expect(DEFAULT_MONTHLY_BUDGET).toBe(500);
  });

  it("LOW_CREDIT_THRESHOLD is 0.2", () => {
    expect(LOW_CREDIT_THRESHOLD).toBe(0.2);
  });
});

describe("recordCreditUsage", () => {
  it("creates a credit usage record with default cost", async () => {
    mockCreditUsageCreate.mockResolvedValue({ id: "cu-1" });

    await recordCreditUsage("user-1", "generate");

    expect(mockCreditUsageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        action: "generate",
        creditCost: 10, // CREDIT_COSTS.generate
      }),
    });
  });

  it("uses provided creditCost over default", async () => {
    mockCreditUsageCreate.mockResolvedValue({ id: "cu-2" });

    await recordCreditUsage("user-1", "custom", { creditCost: 5, songId: "song-1" });

    expect(mockCreditUsageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        creditCost: 5,
        songId: "song-1",
      }),
    });
  });

  it("uses 0 for unknown action when no cost provided", async () => {
    mockCreditUsageCreate.mockResolvedValue({ id: "cu-3" });

    await recordCreditUsage("user-1", "unknown_action");

    expect(mockCreditUsageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ creditCost: 0 }),
    });
  });

  it("includes description when provided", async () => {
    mockCreditUsageCreate.mockResolvedValue({ id: "cu-4" });

    await recordCreditUsage("user-1", "generate", { description: "Song: My Track" });

    expect(mockCreditUsageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ description: "Song: My Track" }),
    });
  });
});

describe("getMonthlyCreditUsage", () => {
  it("returns usage summary with correct calculations (grace period budget = 500)", async () => {
    mockCreditUsageAggregate
      .mockResolvedValueOnce({ _sum: { creditCost: 100 }, _count: 10 }) // monthly
      .mockResolvedValueOnce({ _sum: { creditCost: 200 }, _count: 20 }); // all time
    mockQueryRaw.mockResolvedValue([]);

    const usage = await getMonthlyCreditUsage("user-1");

    expect(usage.creditsUsedThisMonth).toBe(100);
    expect(usage.creditsRemaining).toBe(400); // 500 - 100 (grace period budget)
    expect(usage.generationsThisMonth).toBe(10);
    expect(usage.totalCreditsAllTime).toBe(200);
    expect(usage.totalGenerationsAllTime).toBe(20);
    expect(usage.budget).toBe(500);
    expect(usage.isLow).toBe(false); // 100/500 = 20%, threshold triggers at 80%
  });

  it("marks isLow=true when usage exceeds threshold", async () => {
    // LOW_CREDIT_THRESHOLD = 0.2 means warn when < 20% remaining (> 80% used)
    mockCreditUsageAggregate
      .mockResolvedValueOnce({ _sum: { creditCost: 450 }, _count: 45 }) // 90% used
      .mockResolvedValueOnce({ _sum: { creditCost: 450 }, _count: 45 });
    mockQueryRaw.mockResolvedValue([]);

    const usage = await getMonthlyCreditUsage("user-1");

    expect(usage.isLow).toBe(true);
    expect(usage.creditsRemaining).toBe(50);
  });

  it("creditsRemaining is 0 when budget exhausted", async () => {
    mockCreditUsageAggregate
      .mockResolvedValueOnce({ _sum: { creditCost: 600 }, _count: 60 })
      .mockResolvedValueOnce({ _sum: { creditCost: 600 }, _count: 60 });
    mockQueryRaw.mockResolvedValue([]);

    const usage = await getMonthlyCreditUsage("user-1");

    expect(usage.creditsRemaining).toBe(0); // clamped to 0
  });

  it("handles null _sum.creditCost", async () => {
    mockCreditUsageAggregate
      .mockResolvedValueOnce({ _sum: { creditCost: null }, _count: 0 })
      .mockResolvedValueOnce({ _sum: { creditCost: null }, _count: 0 });
    mockQueryRaw.mockResolvedValue([]);

    const usage = await getMonthlyCreditUsage("user-1");

    expect(usage.creditsUsedThisMonth).toBe(0);
    expect(usage.creditsRemaining).toBe(500);
  });

  it("uses subscription tier budget after grace period ends", async () => {
    // Simulate time after the 30-day grace period
    vi.setSystemTime(new Date("2026-05-01T00:00:00Z"));

    mockSubscriptionFindUnique.mockResolvedValue({ tier: "starter", status: "active" });
    mockCreditUsageAggregate
      .mockResolvedValueOnce({ _sum: { creditCost: 100 }, _count: 10 })
      .mockResolvedValueOnce({ _sum: { creditCost: 100 }, _count: 10 });
    mockQueryRaw.mockResolvedValue([]);

    const usage = await getMonthlyCreditUsage("user-1");

    expect(usage.budget).toBe(1500); // starter tier
    expect(usage.creditsRemaining).toBe(1400);
  });

  it("uses free tier budget for users without a subscription after grace period", async () => {
    vi.setSystemTime(new Date("2026-05-01T00:00:00Z"));

    mockSubscriptionFindUnique.mockResolvedValue(null);
    mockCreditUsageAggregate
      .mockResolvedValueOnce({ _sum: { creditCost: 50 }, _count: 5 })
      .mockResolvedValueOnce({ _sum: { creditCost: 50 }, _count: 5 });
    mockQueryRaw.mockResolvedValue([]);

    const usage = await getMonthlyCreditUsage("user-1");

    expect(usage.budget).toBe(200); // free tier
  });
});

describe("getCreditCost", () => {
  it("returns the cost for a known action", () => {
    expect(getCreditCost("generate")).toBe(10);
    expect(getCreditCost("lyrics")).toBe(2);
    expect(getCreditCost("style_boost")).toBe(5);
  });

  it("falls back to generate cost for unknown actions", () => {
    expect(getCreditCost("unknown_action")).toBe(10);
  });
});

describe("checkCredits", () => {
  it("returns ok=true when user has sufficient credits", async () => {
    mockCreditUsageAggregate
      .mockResolvedValueOnce({ _sum: { creditCost: 100 }, _count: 10 })
      .mockResolvedValueOnce({ _sum: { creditCost: 100 }, _count: 10 });
    mockQueryRaw.mockResolvedValue([]);

    const result = await checkCredits("user-1", "generate");

    expect(result.ok).toBe(true);
    expect(result.creditCost).toBe(10);
    expect(result.creditsRemaining).toBe(400);
  });

  it("returns ok=false when user has insufficient credits", async () => {
    mockCreditUsageAggregate
      .mockResolvedValueOnce({ _sum: { creditCost: 495 }, _count: 49 })
      .mockResolvedValueOnce({ _sum: { creditCost: 495 }, _count: 49 });
    mockQueryRaw.mockResolvedValue([]);

    const result = await checkCredits("user-1", "generate");

    expect(result.ok).toBe(false);
    expect(result.creditCost).toBe(10);
    expect(result.creditsRemaining).toBe(5);
  });

  it("uses the action-specific cost", async () => {
    mockCreditUsageAggregate
      .mockResolvedValueOnce({ _sum: { creditCost: 498 }, _count: 49 })
      .mockResolvedValueOnce({ _sum: { creditCost: 498 }, _count: 49 });
    mockQueryRaw.mockResolvedValue([]);

    const result = await checkCredits("user-1", "lyrics");

    expect(result.ok).toBe(true);
    expect(result.creditCost).toBe(2);
    expect(result.creditsRemaining).toBe(2);
  });
});

describe("deductCredits", () => {
  it("records usage with the correct cost for the action", async () => {
    mockCreditUsageCreate.mockResolvedValue({ id: "cu-1" });
    mockCreditUsageAggregate.mockResolvedValue({ _sum: { creditCost: 100 }, _count: 10 });
    mockQueryRaw.mockResolvedValue([]);

    await deductCredits("user-1", "generate", { songId: "song-1", description: "test" });

    expect(mockCreditUsageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        action: "generate",
        creditCost: 10,
        songId: "song-1",
        description: "test",
      }),
    });
    // Within the subscription budget → no top-up debit
    expect(mockCreditTopUpUpdateMany).not.toHaveBeenCalled();
  });

  it("delegates low-credit notification to notifications module", async () => {
    mockCreditUsageCreate.mockResolvedValue({ id: "cu-1" });
    mockCreditUsageAggregate.mockResolvedValue({ _sum: { creditCost: 460 }, _count: 46 });
    mockQueryRaw.mockResolvedValue([]);

    await deductCredits("user-1", "generate");

    expect(mockNotifyLowCreditsIfNeeded).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ isLow: true }),
    );
  });

  it("does not fail if notification check throws", async () => {
    mockCreditUsageCreate.mockResolvedValue({ id: "cu-1" });
    mockCreditUsageAggregate.mockResolvedValue({ _sum: { creditCost: 100 }, _count: 10 });
    // Make the post-transaction getMonthlyCreditUsage fail on the daily chart
    mockQueryRaw.mockRejectedValue(new Error("db error"));

    await expect(deductCredits("user-1", "generate")).resolves.toBeUndefined();
    expect(mockCreditUsageCreate).toHaveBeenCalled();
  });

  it("propagates a failure of the transactional deduction (money correctness)", async () => {
    mockCreditUsageCreate.mockRejectedValue(new Error("db down"));

    await expect(deductCredits("user-1", "generate")).rejects.toThrow("db down");
    expect(mockNotifyLowCreditsIfNeeded).not.toHaveBeenCalled();
  });
});

describe("top-up ledger (FIFO consumption)", () => {
  const MAY = new Date("2026-05-10T12:00:00Z"); // past the grace period

  beforeEach(() => {
    vi.setSystemTime(MAY);
    installLedgerFake();
  });

  it("REGRESSION: consumed top-ups do not replenish at the month boundary", async () => {
    topUpRows.push({
      id: "t1",
      credits: 100,
      consumedCredits: 0,
      expiresAt: new Date("2027-05-01T00:00:00Z"),
      createdAt: MAY,
    });

    await spend(250); // 200 subscription + 50 drawn from the top-up

    const monthOne = await getMonthlyCreditUsage("user-1");
    expect(monthOne.subscriptionCreditsRemaining).toBe(0);
    expect(monthOne.topUpCreditsRemaining).toBe(50);
    expect(monthOne.creditsRemaining).toBe(50);

    vi.setSystemTime(new Date("2026-06-02T12:00:00Z"));
    const monthTwo = await getMonthlyCreditUsage("user-1");
    // Pre-ledger formula reported 300 here: the month window reset silently
    // replenished the fully/partially consumed top-up.
    expect(monthTwo.creditsRemaining).toBe(250);
    expect(monthTwo.subscriptionCreditsRemaining).toBe(200);
    expect(monthTwo.topUpCreditsRemaining).toBe(50);
  });

  it("drains the earliest-expiring top-up first (FIFO)", async () => {
    topUpRows.push(
      {
        id: "late",
        credits: 50,
        consumedCredits: 0,
        expiresAt: new Date("2026-12-01T00:00:00Z"),
        createdAt: new Date("2026-05-01T00:00:00Z"),
      },
      {
        id: "early",
        credits: 50,
        consumedCredits: 0,
        expiresAt: new Date("2026-08-01T00:00:00Z"),
        createdAt: new Date("2026-05-02T00:00:00Z"),
      },
    );

    await spend(260); // 60 overflow past the 200 subscription budget

    expect(topUpRows.find((r) => r.id === "early")?.consumedCredits).toBe(50);
    expect(topUpRows.find((r) => r.id === "late")?.consumedCredits).toBe(10);
  });

  it("excludes an expired top-up's remainder without resurrecting its consumption", async () => {
    topUpRows.push(
      {
        id: "expired",
        credits: 100,
        consumedCredits: 30,
        expiresAt: new Date("2026-04-01T00:00:00Z"),
        createdAt: new Date("2026-03-01T00:00:00Z"),
      },
      {
        id: "active",
        credits: 50,
        consumedCredits: 0,
        expiresAt: null,
        createdAt: new Date("2026-05-01T00:00:00Z"),
      },
    );

    const usage = await getMonthlyCreditUsage("user-1");

    expect(usage.topUpCredits).toBe(50); // gross excludes the expired row
    expect(usage.topUpCreditsRemaining).toBe(50);
    expect(usage.creditsRemaining).toBe(250); // 200 subscription + 50 active
  });

  it("debits exactly the single-month overflow into consumedCredits", async () => {
    topUpRows.push({
      id: "t1",
      credits: 100,
      consumedCredits: 0,
      expiresAt: null,
      createdAt: MAY,
    });

    await spend(210); // 10 past the 200 subscription budget

    expect(topUpRows[0].consumedCredits).toBe(10);
    const usage = await getMonthlyCreditUsage("user-1");
    expect(usage.subscriptionCreditsRemaining).toBe(0);
    expect(usage.topUpCreditsRemaining).toBe(90);
    expect(usage.creditsRemaining).toBe(90);
  });

  it("checkCredits blocks only when both pools are drained", async () => {
    topUpRows.push({
      id: "t1",
      credits: 100,
      consumedCredits: 85,
      expiresAt: null,
      createdAt: MAY,
    });
    usageRows.push({ creditCost: 200, createdAt: MAY }); // subscription exhausted

    const allowed = await checkCredits("user-1", "generate");
    expect(allowed.ok).toBe(true); // 15 left in the lifetime top-up pool
    expect(allowed.creditsRemaining).toBe(15);

    topUpRows[0].consumedCredits = 95; // net 5 < generate cost 10
    const blocked = await checkCredits("user-1", "generate");
    expect(blocked.ok).toBe(false);
    expect(blocked.creditsRemaining).toBe(5);
  });

  it("never drives consumedCredits above credits when the FIFO read is stale", async () => {
    topUpRows.push({
      id: "t1",
      credits: 100,
      consumedCredits: 95,
      expiresAt: null,
      createdAt: MAY,
    });
    usageRows.push({ creditCost: 200, createdAt: MAY });

    // Simulate a concurrent spend: the FIFO read observed the row before the
    // other transaction's debit landed, the conditional update runs after.
    mockCreditTopUpFindMany.mockResolvedValueOnce([
      { id: "t1", credits: 100, consumedCredits: 0 },
    ]);

    await expect(deductCredits("user-1", "generate")).resolves.toBeUndefined();

    // Guard (consumedCredits <= 90) rejected the stale 10-credit debit — the
    // row stays at 95 instead of being driven to 105 (> credits).
    expect(topUpRows[0].consumedCredits).toBe(95);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

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

const mockLogAdminAction = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/auth", () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
}));

const mockUserFindUnique = vi.fn();
const mockCreditUsageCreate = vi.fn();
const mockCreditTopUpCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    creditUsage: {
      create: (...args: unknown[]) => mockCreditUsageCreate(...args),
    },
    creditTopUp: {
      create: (...args: unknown[]) => mockCreditTopUpCreate(...args),
    },
  },
}));

import { adjustUserCredits } from "./users";

beforeEach(() => {
  vi.clearAllMocks();
  mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "user@example.com" });
  mockCreditUsageCreate.mockResolvedValue({ id: "cu-1" });
  mockCreditTopUpCreate.mockResolvedValue({ id: "topup-1" });
});

describe("adjustUserCredits", () => {
  it("rejects a zero amount", async () => {
    const result = await adjustUserCredits("user-1", 0, "reason", "admin-1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION_ERROR");
    expect(mockCreditUsageCreate).not.toHaveBeenCalled();
    expect(mockCreditTopUpCreate).not.toHaveBeenCalled();
  });

  it("returns not-found for an unknown user", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const result = await adjustUserCredits("nope", 50, "reason", "admin-1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("routes a positive grant through a durable non-expiring CreditTopUp", async () => {
    const result = await adjustUserCredits("user-1", 50, "compensation", "admin-1");

    expect(result.ok).toBe(true);
    // Durable ledger row: survives month boundaries and debits FIFO — a
    // negative CreditUsage row would silently evaporate at the next month.
    expect(mockCreditTopUpCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        credits: 50,
        amountCents: 0,
        expiresAt: null,
        stripeSessionId: expect.stringContaining("admin_grant_user-1_"),
      }),
    });
    expect(mockCreditUsageCreate).not.toHaveBeenCalled();
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      "admin-1",
      "adjust_credits",
      "user-1",
      expect.stringContaining("+50"),
    );
  });

  it("keeps negative adjustments as month-scoped CreditUsage rows", async () => {
    const result = await adjustUserCredits("user-1", -25, "abuse", "admin-1");

    expect(result.ok).toBe(true);
    expect(mockCreditUsageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        action: "admin_adjustment",
        creditCost: 25,
        description: "abuse",
      }),
    });
    expect(mockCreditTopUpCreate).not.toHaveBeenCalled();
  });

  it("truncates fractional amounts", async () => {
    const result = await adjustUserCredits("user-1", 10.9, "partial", "admin-1");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.amount).toBe(10);
    expect(mockCreditTopUpCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ credits: 10 }),
    });
  });
});

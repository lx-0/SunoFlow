import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  get AUTH_SECRET() { return "test-secret"; },
  get NEXTAUTH_URL() { return "http://localhost:3000"; },
  get SUNOAPI_KEY() { return "test-key"; },
  get SUNO_API_TIMEOUT_MS() { return 30000; },
  get RATE_LIMIT_MAX_GENERATIONS() { return 10; },
  env: {},
}));

vi.mock("@/lib/auth-resolver", () => ({
  resolveUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/billing", () => ({
  getOrCreateStripeCustomer: vi.fn(),
}));

vi.mock("@/lib/error-logger", () => ({
  logServerError: vi.fn(),
}));

const mockSessionCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  default: vi.fn(() => ({
    checkout: { sessions: { create: mockSessionCreate } },
  })),
  STRIPE_PRICES: {
    get starter() { return "price_starter_test"; },
    get pro() { return "price_pro_test"; },
    get studio() { return "price_studio_test"; },
  },
}));

import { resolveUser } from "@/lib/auth-resolver";
import { prisma } from "@/lib/prisma";
import { getOrCreateStripeCustomer } from "@/lib/billing";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(resolveUser).mockResolvedValue({
    userId: "user-1",
    isApiKey: false,
    isAdmin: false,
    error: null,
  });
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    email: "user@example.com",
    name: "Test User",
  } as never);
  vi.mocked(getOrCreateStripeCustomer).mockResolvedValue("cus_test_123");
  mockSessionCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session_abc" });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/billing/checkout", () => {
  describe("authentication", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(resolveUser).mockResolvedValue({
        userId: null,
        isApiKey: false,
        isAdmin: false,
        error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never,
      });

      const res = await POST(makeRequest({ tier: "starter" }) as never);
      expect(res.status).toBe(401);
    });
  });

  describe("validation", () => {
    it("returns 400 when tier is missing", async () => {
      const res = await POST(makeRequest({}) as never);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when tier is invalid", async () => {
      const res = await POST(makeRequest({ tier: "enterprise" }) as never);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("user lookup", () => {
    it("returns 400 when user email is not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

      const res = await POST(makeRequest({ tier: "pro" }) as never);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("USER_ERROR");
    });

    it("returns 400 when user has no email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: null, name: null } as never);

      const res = await POST(makeRequest({ tier: "pro" }) as never);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("USER_ERROR");
    });
  });

  describe("success", () => {
    it.each(["starter", "pro", "studio"] as const)(
      "creates a checkout session for tier '%s' and returns url",
      async (tier) => {
        const res = await POST(makeRequest({ tier }) as never);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.url).toBe("https://checkout.stripe.com/session_abc");
      }
    );

    it("creates checkout session with subscription mode and correct metadata", async () => {
      await POST(makeRequest({ tier: "pro" }) as never);

      expect(mockSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          customer: "cus_test_123",
          metadata: { userId: "user-1" },
        })
      );
    });
  });

  describe("error handling", () => {
    it("returns 500 when Stripe throws", async () => {
      mockSessionCreate.mockRejectedValue(new Error("Stripe error"));

      const res = await POST(makeRequest({ tier: "starter" }) as never);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.code).toBe("INTERNAL_ERROR");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

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

const { mockIsStripeConfigured } = vi.hoisted(() => ({
  mockIsStripeConfigured: vi.fn(),
}));
vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: mockIsStripeConfigured,
}));

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockIsStripeConfigured.mockReturnValue(true);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/billing/status", () => {
  it("returns stripeConfigured: true when Stripe is configured", async () => {
    mockIsStripeConfigured.mockReturnValue(true);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.stripeConfigured).toBe(true);
  });

  it("returns stripeConfigured: false when Stripe is not configured", async () => {
    mockIsStripeConfigured.mockReturnValue(false);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.stripeConfigured).toBe(false);
  });
});

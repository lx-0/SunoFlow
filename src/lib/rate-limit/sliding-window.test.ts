import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Regression guard for the 2026-07-18 finding: /api/v1/auth/token (the native
// login, a public password endpoint) matched NO ip bucket after the per-email
// cap rollback — zero brute-force throttling in PROD while the route comment
// claimed coverage. The path now lives in AUTH_PATHS; this test pins it there.
//
// The auth bucket is disabled when process.env.CI === "true" (e2e runs hammer
// auth), so the module is re-imported with CI unset per test.

const params = (pathname: string, ip = "203.0.113.7") => ({
  pathname,
  method: "POST",
  ip,
  userId: undefined,
  isAdmin: false,
  isE2eUser: false,
});

describe("applyRequestRateLimits — auth bucket", () => {
  const originalCi = process.env.CI;

  beforeEach(() => {
    vi.resetModules();
    delete process.env.CI;
  });

  afterEach(() => {
    if (originalCi === undefined) delete process.env.CI;
    else process.env.CI = originalCi;
  });

  it("throttles the native login endpoint after 10 hits from one ip", async () => {
    const { applyRequestRateLimits } = await import("./sliding-window");

    for (let i = 0; i < 10; i++) {
      expect(applyRequestRateLimits(params("/api/v1/auth/token"))).toBeNull();
    }
    const blocked = applyRequestRateLimits(params("/api/v1/auth/token"));

    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
  });

  it("keeps counting per ip — a different ip is not blocked", async () => {
    const { applyRequestRateLimits } = await import("./sliding-window");

    for (let i = 0; i < 11; i++) {
      applyRequestRateLimits(params("/api/v1/auth/token", "203.0.113.7"));
    }

    expect(applyRequestRateLimits(params("/api/v1/auth/token", "198.51.100.9"))).toBeNull();
  });

  it("shares the auth bucket with the web signin paths", async () => {
    const { applyRequestRateLimits } = await import("./sliding-window");

    for (const p of ["/api/auth/signin", "/api/register", "/api/v1/auth/token"]) {
      expect(applyRequestRateLimits(params(p))).toBeNull();
    }
  });
});

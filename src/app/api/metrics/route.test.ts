import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  get AUTH_SECRET() { return "test-secret"; },
  get NEXTAUTH_URL() { return "http://localhost:3000"; },
  get SUNOAPI_KEY() { return "test-key"; },
  get SUNO_API_TIMEOUT_MS() { return 30000; },
  get RATE_LIMIT_MAX_GENERATIONS() { return 10; },
  env: {},
}));

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
  resolveUser: vi.fn(),
}));

const mockGetMetricsSnapshot = vi.fn();
vi.mock("@/lib/metrics", () => ({
  getMetricsSnapshot: (...args: unknown[]) => mockGetMetricsSnapshot(...args),
}));

vi.mock("@/lib/error-logger", () => ({
  logServerError: vi.fn(),
}));

import { GET } from "./route";

describe("GET /api/metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when admin auth fails", async () => {
    const unauthorized = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    mockRequireAdmin.mockResolvedValue({ error: unauthorized, user: null });

    const res = await GET(new NextRequest("http://localhost/api/metrics"), { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("returns the metrics snapshot for admins", async () => {
    mockRequireAdmin.mockResolvedValue({ error: null, user: { id: "admin-1" } });
    mockGetMetricsSnapshot.mockReturnValue({ requests: { total: 42 } });

    const res = await GET(new NextRequest("http://localhost/api/metrics"), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ requests: { total: 42 } });
  });
});

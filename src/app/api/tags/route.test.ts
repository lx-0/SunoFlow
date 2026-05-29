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

const mockResolveUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  resolveUser: (...args: unknown[]) => mockResolveUser(...args),
}));

const mockTagsList = vi.fn();
vi.mock("@/lib/tags", () => ({
  Tags: {
    list: (...args: unknown[]) => mockTagsList(...args),
  },
}));

vi.mock("@/lib/error-logger", () => ({
  logServerError: vi.fn(),
}));

import { GET } from "./route";

describe("GET /api/tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    const unauthorized = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    mockResolveUser.mockResolvedValue({ userId: null, isApiKey: false, isAdmin: false, error: unauthorized });

    const res = await GET(new NextRequest("http://localhost/api/tags"), { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("returns the user's tags", async () => {
    mockResolveUser.mockResolvedValue({ userId: "user-1", isApiKey: false, isAdmin: false, error: null });
    mockTagsList.mockResolvedValue([{ id: "tag-1", name: "Focus", color: "#00AAFF" }]);

    const res = await GET(new NextRequest("http://localhost/api/tags"), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      tags: [{ id: "tag-1", name: "Focus", color: "#00AAFF" }],
    });
  });
});

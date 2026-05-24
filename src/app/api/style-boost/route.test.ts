import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  get AUTH_SECRET() { return "test-secret"; },
  get NEXTAUTH_URL() { return "http://localhost:3000"; },
  get SUNOAPI_KEY() { return "test-key"; },
  get SUNO_API_TIMEOUT_MS() { return 30000; },
  get RATE_LIMIT_MAX_GENERATIONS() { return 10; },
  env: {},
}));

vi.mock("@/lib/auth", () => ({
  resolveUser: vi.fn(),
}));

vi.mock("@/lib/sunoapi", () => ({
  resolveUserApiKey: vi.fn(),
  boostStyle: vi.fn(),
  SunoApiError: class SunoApiError extends Error {
    status: number;

    constructor(status: number, message = "Suno API error") {
      super(message);
      this.status = status;
      this.name = "SunoApiError";
    }
  },
}));

import { resolveUser } from "@/lib/auth";
import { resolveUserApiKey, boostStyle, SunoApiError } from "@/lib/sunoapi";
import { POST } from "./route";

const seg = { params: Promise.resolve({}) } as never;

describe("POST /api/style-boost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveUser).mockResolvedValue({
      userId: "user-1",
      isApiKey: false,
      isAdmin: false,
      error: null,
    });
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(resolveUser).mockResolvedValue({
      userId: null,
      isApiKey: false,
      isAdmin: false,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as never,
    });

    const request = new NextRequest("http://localhost/api/style-boost", {
      method: "POST",
      body: JSON.stringify({ content: "boost this" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(request, seg);
    expect(res.status).toBe(401);
  });

  it("returns 400 when no user Suno key is configured", async () => {
    vi.mocked(resolveUserApiKey).mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost/api/style-boost", {
      method: "POST",
      body: JSON.stringify({ content: "boost this" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(request, seg);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data).toEqual({
      error: "No Suno API key configured",
      code: "VALIDATION_ERROR",
    });
  });

  it("returns boosted style data on success", async () => {
    vi.mocked(resolveUserApiKey).mockResolvedValue("user-key");
    vi.mocked(boostStyle).mockResolvedValue({
      taskId: "task-1",
      param: "upbeat pop style",
      result: "cinematic pop with brighter chorus lifts",
      creditsConsumed: 2,
      creditsRemaining: 98,
    });

    const request = new NextRequest("http://localhost/api/style-boost", {
      method: "POST",
      body: JSON.stringify({ content: "upbeat pop style" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(request, seg);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({
      result: "cinematic pop with brighter chorus lifts",
      creditsConsumed: 2,
      creditsRemaining: 98,
    });
  });

  it("maps upstream 503 to style-boost-specific service unavailable message", async () => {
    vi.mocked(resolveUserApiKey).mockResolvedValue("user-key");
    vi.mocked(boostStyle).mockRejectedValue(new SunoApiError(503, "upstream down"));

    const request = new NextRequest("http://localhost/api/style-boost", {
      method: "POST",
      body: JSON.stringify({ content: "upbeat pop style" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(request, seg);
    const data = await res.json();
    expect(res.status).toBe(503);
    expect(data).toEqual({
      error: "Style boost failed. Please try again.",
      code: "SERVICE_UNAVAILABLE",
    });
  });
});

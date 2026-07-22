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

vi.mock("@/lib/auth", () => ({
  resolveUser: vi.fn(),
}));

vi.mock("@/lib/jam", () => ({
  createJamSession: vi.fn(),
}));

import { POST } from "./route";
import { resolveUser } from "@/lib/auth";
import { createJamSession } from "@/lib/jam";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/jam-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUser).mockResolvedValue({ userId: "user-1" } as never);
});

describe("POST /api/jam-sessions", () => {
  it("returns 201 with the created session", async () => {
    const session = { id: "jam-1", shareToken: "tok", status: "open" };
    vi.mocked(createJamSession).mockResolvedValue({
      ok: true,
      data: { session },
    } as never);

    const res = await POST(makeRequest({ budgetTotal: 20 }), {
      params: Promise.resolve({}),
    } as never);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.session.id).toBe("jam-1");
    expect(createJamSession).toHaveBeenCalledWith("user-1", { budgetTotal: 20 });
  });

  it("maps a forbidden result to 403", async () => {
    vi.mocked(createJamSession).mockResolvedValue({
      ok: false,
      error: "Studio tier required",
      code: "FORBIDDEN",
      status: 403,
    } as never);

    const res = await POST(makeRequest({}), {
      params: Promise.resolve({}),
    } as never);

    expect(res.status).toBe(403);
  });

  it("rejects an invalid budget at the schema boundary", async () => {
    const res = await POST(makeRequest({ budgetTotal: 0 }), {
      params: Promise.resolve({}),
    } as never);

    expect(res.status).toBe(400);
    expect(createJamSession).not.toHaveBeenCalled();
  });
});

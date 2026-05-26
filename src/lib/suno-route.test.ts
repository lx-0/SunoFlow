import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/sunoapi", () => ({
  resolveUserApiKey: vi.fn(),
  SunoApiError: class SunoApiError extends Error {
    status: number;

    constructor(status: number, message = "Suno API error") {
      super(message);
      this.status = status;
      this.name = "SunoApiError";
    }
  },
}));

vi.mock("@/lib/error-logger", () => ({
  logServerError: vi.fn(),
}));

import { resolveUserApiKey, SunoApiError } from "@/lib/sunoapi";
import { runSunoRoute, runSunoUserRoute } from "@/lib/suno-route";

describe("runSunoRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success response from runner", async () => {
    const res = await runSunoRoute(
      async () => NextResponse.json({ ok: true }),
      { logLabel: "test", route: "/api/test" }
    );

    expect((res as Response).status).toBe(200);
    expect(await (res as Response).json()).toEqual({ ok: true });
  });

  it("maps Suno API errors", async () => {
    const res = await runSunoRoute(
      async () => {
        throw new SunoApiError(404, "missing");
      },
      { logLabel: "test", route: "/api/test" }
    );

    expect((res as Response).status).toBe(502);
    expect(await (res as Response).json()).toMatchObject({
      code: "SUNO_API_ERROR",
    });
  });
});

describe("runSunoUserRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns key validation error when user key is missing", async () => {
    vi.mocked(resolveUserApiKey).mockResolvedValue(null);

    const res = await runSunoUserRoute(
      "user-1",
      async () => NextResponse.json({ ok: true }),
      { logLabel: "test", route: "/api/test" }
    );

    expect((res as Response).status).toBe(400);
  });

  it("passes resolved api key to route callback", async () => {
    vi.mocked(resolveUserApiKey).mockResolvedValue("user-key");

    const res = await runSunoUserRoute(
      "user-1",
      async (apiKey) => NextResponse.json({ apiKey }),
      { logLabel: "test", route: "/api/test" }
    );

    expect((res as Response).status).toBe(200);
    expect(await (res as Response).json()).toEqual({ apiKey: "user-key" });
  });
});

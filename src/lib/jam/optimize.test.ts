import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { jamSession: { findUnique: vi.fn() } },
}));

vi.mock("@/lib/sunoapi", () => {
  class SunoApiError extends Error {
    constructor(
      public readonly status: number,
      message: string,
      public readonly code: string = "UNKNOWN",
    ) {
      super(message);
      this.name = "SunoApiError";
    }
  }
  return { SunoApiError, boostStyle: vi.fn(), resolveUserApiKeyWithMode: vi.fn() };
});

vi.mock("@/lib/env", () => ({ get SUNOAPI_KEY() { return "server-key"; } }));
vi.mock("@/lib/llm", () => ({ generateText: vi.fn() }));
vi.mock("./session-signal", async (orig) => ({
  ...(await orig<typeof import("./session-signal")>()),
  getJamSessionSignal: vi.fn(),
}));
vi.mock("@/lib/error-logger", () => ({ logServerError: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { prisma } from "@/lib/prisma";
import { boostStyle, resolveUserApiKeyWithMode, SunoApiError } from "@/lib/sunoapi";
import { generateText } from "@/lib/llm";
import { getJamSessionSignal } from "./session-signal";
import { optimizeJamPrompt } from "./optimize";

const SESSION = {
  id: "jam-1",
  status: "open",
  hostUserId: "host-1",
  budgetTotal: 30,
  budgetUsed: 4,
  expiresAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.jamSession.findUnique).mockResolvedValue(SESSION as never);
  vi.mocked(resolveUserApiKeyWithMode).mockResolvedValue({
    apiKey: "host-key",
    usingPersonalKey: true,
  } as never);
  vi.mocked(boostStyle).mockResolvedValue({ result: "lush italo disco, 118bpm" } as never);
  vi.mocked(getJamSessionSignal).mockResolvedValue({ landed: [], rejected: [] });
});

describe("optimizeJamPrompt", () => {
  it("runs on the host's key, not the guest's", async () => {
    await optimizeJamPrompt("tok", { promptText: "italo disco" });

    expect(resolveUserApiKeyWithMode).toHaveBeenCalledWith("host-1");
    expect(vi.mocked(boostStyle).mock.calls[0]?.[1]).toBe("host-key");
  });

  it("404s for unknown tokens", async () => {
    vi.mocked(prisma.jamSession.findUnique).mockResolvedValue(null as never);

    const result = await optimizeJamPrompt("nope", { promptText: "italo disco" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("refuses once the party budget is used up, so it cannot burn host credits", async () => {
    vi.mocked(prisma.jamSession.findUnique).mockResolvedValue({
      ...SESSION,
      budgetUsed: 30,
    } as never);

    const result = await optimizeJamPrompt("tok", { promptText: "italo disco" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("LIMIT_REACHED");
    expect(boostStyle).not.toHaveBeenCalled();
  });

  it("truncates to the prompt cap so the result stays submittable", async () => {
    vi.mocked(boostStyle).mockResolvedValue({ result: "x".repeat(900) } as never);

    const result = await optimizeJamPrompt("tok", { promptText: "italo disco" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.prompt.length).toBe(500);
  });

  it("echoes the input in keyless demo mode instead of failing", async () => {
    vi.mocked(resolveUserApiKeyWithMode).mockResolvedValue({
      apiKey: undefined,
      usingPersonalKey: false,
    } as never);
    vi.doMock("@/lib/env", () => ({ get SUNOAPI_KEY() { return ""; } }));

    const result = await optimizeJamPrompt("tok", { promptText: "italo disco" });

    expect(result.ok).toBe(true);
  });

  it("maps upstream rejections to 502", async () => {
    vi.mocked(boostStyle).mockRejectedValue(new SunoApiError(400, "nope"));

    const result = await optimizeJamPrompt("tok", { promptText: "italo disco" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(502);
  });
});

describe("optimizeJamPrompt — party feedback", () => {
  it("falls back to Suno's stateless boost while the party has no signal yet", async () => {
    const result = await optimizeJamPrompt("tok", { promptText: "italo disco" });

    expect(generateText).not.toHaveBeenCalled();
    expect(boostStyle).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.prompt).toBe("lush italo disco, 118bpm");
  });

  it("steers the rewrite with what landed and what the host vetoed", async () => {
    vi.mocked(getJamSessionSignal).mockResolvedValue({
      landed: ["deep house, warm bass"],
      rejected: ["speedcore"],
    });
    vi.mocked(generateText).mockResolvedValue("italo disco with warm analog bass");

    const result = await optimizeJamPrompt("tok", { promptText: "italo disco" });

    const userPrompt = vi.mocked(generateText).mock.calls[0]?.[1] ?? "";
    expect(userPrompt).toContain("italo disco");
    expect(userPrompt).toContain("deep house, warm bass");
    expect(userPrompt).toContain("speedcore");
    // The party-aware rewrite wins; Suno's stateless boost is not consulted.
    expect(boostStyle).not.toHaveBeenCalled();
    if (result.ok) expect(result.data.prompt).toBe("italo disco with warm analog bass");
  });

  it("falls back to the boost when the model returns nothing usable", async () => {
    vi.mocked(getJamSessionSignal).mockResolvedValue({ landed: ["x"], rejected: [] });
    vi.mocked(generateText).mockResolvedValue(null);

    const result = await optimizeJamPrompt("tok", { promptText: "italo disco" });

    expect(boostStyle).toHaveBeenCalled();
    if (result.ok) expect(result.data.prompt).toBe("lush italo disco, 118bpm");
  });

  it("unwraps the fences and quotes models add regardless of instructions", async () => {
    vi.mocked(getJamSessionSignal).mockResolvedValue({ landed: ["x"], rejected: [] });
    vi.mocked(generateText).mockResolvedValue('```\n"italo disco, 118bpm"\n```');

    const result = await optimizeJamPrompt("tok", { promptText: "italo disco" });

    if (result.ok) expect(result.data.prompt).toBe("italo disco, 118bpm");
  });

  it("truncates a steered rewrite to the submittable cap too", async () => {
    vi.mocked(getJamSessionSignal).mockResolvedValue({ landed: ["x"], rejected: [] });
    vi.mocked(generateText).mockResolvedValue("y".repeat(900));

    const result = await optimizeJamPrompt("tok", { promptText: "italo disco" });

    if (result.ok) expect(result.data.prompt.length).toBe(500);
  });
});

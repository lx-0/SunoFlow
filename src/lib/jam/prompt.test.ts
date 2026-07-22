import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jamSession: { findUnique: vi.fn(), updateMany: vi.fn() },
    jamSessionEntry: { count: vi.fn(), create: vi.fn() },
    song: { create: vi.fn() },
    $transaction: vi.fn(),
  },
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
  return {
    SunoApiError,
    generateSong: vi.fn(),
    resolveUserApiKeyWithMode: vi.fn(),
  };
});

vi.mock("@/lib/credits", () => ({
  checkCredits: vi.fn(),
  deductCredits: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  get SUNOAPI_KEY() { return "server-key"; },
}));

vi.mock("@/lib/error-logger", () => ({ logServerError: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { prisma } from "@/lib/prisma";
import { generateSong, resolveUserApiKeyWithMode, SunoApiError } from "@/lib/sunoapi";
import { checkCredits, deductCredits } from "@/lib/credits";
import { pushJamPrompt } from "./prompt";

const SESSION = {
  id: "jam-1",
  status: "open",
  hostUserId: "host-1",
  budgetTotal: 30,
  budgetUsed: 4,
  expiresAt: null,
};

const ENTRY = {
  id: "entry-1",
  status: "pending",
  promptText: "italo disco about cold pizza",
  guestName: "Ken",
  createdAt: new Date("2026-07-22T20:00:00Z"),
  song: {
    id: "song-1",
    title: null,
    imageUrl: null,
    duration: null,
    generationStatus: "pending",
  },
};

const INPUT = {
  promptText: "italo disco about cold pizza",
  guestName: "Ken",
  guestKey: "guest-device-12345",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.jamSession.findUnique).mockResolvedValue(SESSION as never);
  vi.mocked(prisma.jamSessionEntry.count).mockResolvedValue(0 as never);
  vi.mocked(prisma.jamSession.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(resolveUserApiKeyWithMode).mockResolvedValue({
    apiKey: undefined,
    usingPersonalKey: false,
  } as never);
  vi.mocked(checkCredits).mockResolvedValue({
    ok: true,
    creditCost: 10,
    creditsRemaining: 100,
  } as never);
  vi.mocked(generateSong).mockResolvedValue({ taskId: "task-1" } as never);
  vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
    if (typeof fn === "function") {
      return fn({
        song: { create: vi.fn().mockResolvedValue({ id: "song-1" }) },
        jamSessionEntry: { create: vi.fn().mockResolvedValue(ENTRY) },
      });
    }
    return [];
  });
});

describe("pushJamPrompt", () => {
  it("404s for unknown tokens", async () => {
    vi.mocked(prisma.jamSession.findUnique).mockResolvedValue(null as never);

    const result = await pushJamPrompt("nope", INPUT);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("409s when the session is closed", async () => {
    vi.mocked(prisma.jamSession.findUnique).mockResolvedValue({
      ...SESSION,
      status: "closed",
    } as never);

    const result = await pushJamPrompt("tok", INPUT);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("CONFLICT");
  });

  it("409s when the session lifetime has expired", async () => {
    vi.mocked(prisma.jamSession.findUnique).mockResolvedValue({
      ...SESSION,
      expiresAt: new Date(Date.now() - 1000),
    } as never);

    const result = await pushJamPrompt("tok", INPUT);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("CONFLICT");
    expect(prisma.jamSession.updateMany).not.toHaveBeenCalled();
  });

  it("rejects empty prompts after sanitizing", async () => {
    const result = await pushJamPrompt("tok", { ...INPUT, promptText: "  <b></b> " });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION_ERROR");
    expect(prisma.jamSession.updateMany).not.toHaveBeenCalled();
  });

  it("caps open prompts per guest", async () => {
    vi.mocked(prisma.jamSessionEntry.count).mockResolvedValue(2 as never);

    const result = await pushJamPrompt("tok", INPUT);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("RATE_LIMITED");
    expect(prisma.jamSession.updateMany).not.toHaveBeenCalled();
  });

  it("fails without overshoot when the budget race is lost", async () => {
    vi.mocked(prisma.jamSession.updateMany).mockResolvedValue({ count: 0 } as never);

    const result = await pushJamPrompt("tok", INPUT);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("LIMIT_REACHED");
    expect(generateSong).not.toHaveBeenCalled();
  });

  it("starts the generation and creates song + entry", async () => {
    const result = await pushJamPrompt("tok", INPUT);

    expect(result).toEqual({ ok: true, data: { entry: ENTRY } });
    expect(generateSong).toHaveBeenCalledWith(
      "italo disco about cold pizza",
      {},
      undefined,
    );
    expect(deductCredits).toHaveBeenCalledWith("host-1", "generate", {
      songId: "song-1",
      description: expect.stringContaining("Jam session prompt"),
    });
  });

  it("releases the budget reservation when the host is out of credits", async () => {
    vi.mocked(checkCredits).mockResolvedValue({
      ok: false,
      creditCost: 10,
      creditsRemaining: 0,
    } as never);

    const result = await pushJamPrompt("tok", INPUT);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("LIMIT_REACHED");
    // reservation increment + compensating decrement
    expect(prisma.jamSession.updateMany).toHaveBeenCalledTimes(2);
    expect(generateSong).not.toHaveBeenCalled();
  });

  it("releases the budget and maps Suno rejections to 502", async () => {
    vi.mocked(generateSong).mockRejectedValue(
      new SunoApiError(400, "flagged prompt", "COMPLIANCE_BLOCK"),
    );

    const result = await pushJamPrompt("tok", INPUT);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(502);
      expect(result.code).toBe("SUNO_API_ERROR");
    }
    expect(prisma.jamSession.updateMany).toHaveBeenCalledTimes(2);
  });

  it("skips internal credits for personal-key hosts", async () => {
    vi.mocked(resolveUserApiKeyWithMode).mockResolvedValue({
      apiKey: "personal-key",
      usingPersonalKey: true,
    } as never);

    const result = await pushJamPrompt("tok", INPUT);

    expect(result.ok).toBe(true);
    expect(checkCredits).not.toHaveBeenCalled();
    expect(deductCredits).not.toHaveBeenCalled();
    expect(generateSong).toHaveBeenCalledWith(
      "italo disco about cold pizza",
      {},
      "personal-key",
    );
  });
});

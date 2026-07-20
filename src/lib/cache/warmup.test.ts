import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() {
    return "postgres://test:test@localhost:5432/test";
  },
  env: {},
}));

const mockSongFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: { findMany: (...a: unknown[]) => mockSongFindMany(...a) },
  },
}));

vi.mock("./file", () => ({
  audioCache: { has: vi.fn(() => false), downloadAndPut: vi.fn() },
  imageCache: { has: vi.fn(() => false), downloadAndPut: vi.fn() },
}));

vi.mock("@/lib/sunoapi", () => ({
  resolveUserApiKey: vi.fn(),
}));

vi.mock("@/lib/songs/asset-refresh", () => ({
  refreshSongCdnUrls: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe("warmUpAudioCache batch cap", () => {
  const OLD_ENV = process.env.CACHE_WARMUP_BATCH_SIZE;

  beforeEach(() => {
    vi.resetModules();
    mockSongFindMany.mockReset();
    mockSongFindMany.mockResolvedValue([]);
  });

  afterEach(() => {
    if (OLD_ENV === undefined) delete process.env.CACHE_WARMUP_BATCH_SIZE;
    else process.env.CACHE_WARMUP_BATCH_SIZE = OLD_ENV;
  });

  it("passes a bounded numeric take when the env var is unset (never undefined)", async () => {
    delete process.env.CACHE_WARMUP_BATCH_SIZE;
    const { warmUpAudioCache, DEFAULT_CACHE_WARMUP_BATCH_SIZE } = await import("./warmup");

    await warmUpAudioCache();

    expect(mockSongFindMany).toHaveBeenCalledTimes(1);
    const arg = mockSongFindMany.mock.calls[0][0] as { take?: unknown };
    expect(typeof arg.take).toBe("number");
    expect(arg.take).toBe(DEFAULT_CACHE_WARMUP_BATCH_SIZE);
    expect(arg.take).toBeGreaterThan(0);
  });

  it("honors a valid env override", async () => {
    process.env.CACHE_WARMUP_BATCH_SIZE = "25";
    const { warmUpAudioCache } = await import("./warmup");

    await warmUpAudioCache();

    const arg = mockSongFindMany.mock.calls[0][0] as { take?: unknown };
    expect(arg.take).toBe(25);
  });

  it("falls back to the default for an invalid env value", async () => {
    process.env.CACHE_WARMUP_BATCH_SIZE = "not-a-number";
    const { warmUpAudioCache, DEFAULT_CACHE_WARMUP_BATCH_SIZE } = await import("./warmup");

    await warmUpAudioCache();

    const arg = mockSongFindMany.mock.calls[0][0] as { take?: unknown };
    expect(arg.take).toBe(DEFAULT_CACHE_WARMUP_BATCH_SIZE);
  });
});

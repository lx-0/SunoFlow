import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { song: { update: vi.fn() } },
}));
vi.mock("@/lib/cache", () => ({
  imageCache: { get: vi.fn(), downloadAndPut: vi.fn() },
}));
vi.mock("@/lib/sunoapi", () => ({
  fetchFreshUrls: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { prisma } from "@/lib/prisma";
import { imageCache } from "@/lib/cache";
import { fetchFreshUrls } from "@/lib/sunoapi";
import { proxyImage, type ImageProxyParams } from "@/lib/images/proxy";

const DEAD_URL = "https://tempfile.aiquickdraw.com/x/dead.jpeg";
const FRESH_AUDIO = "https://tempfile.aiquickdraw.com/x/fresh.mp3";
const FRESH_IMAGE = "https://tempfile.aiquickdraw.com/x/fresh.jpeg";
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

function baseParams(overrides: Partial<ImageProxyParams> = {}): ImageProxyParams {
  return {
    songId: "song1",
    imageUrl: DEAD_URL,
    imageUrlIsCustom: false,
    sunoJobId: "job1",
    sunoAudioId: "clip1",
    parentSunoJobId: null,
    resolveApiKey: async () => "key",
    ...overrides,
  };
}

describe("proxyImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.song.update).mockResolvedValue({} as never);
    vi.mocked(imageCache.get).mockReturnValue(null);
    vi.mocked(imageCache.downloadAndPut).mockResolvedValue(null);
    vi.mocked(fetchFreshUrls).mockResolvedValue(null);
  });

  it("serves a cache hit immutably without touching the network", async () => {
    vi.mocked(imageCache.get).mockReturnValue({ data: JPEG, contentType: "image/png" });

    const res = await proxyImage(baseParams());

    expect(res?.status).toBe(200);
    expect(res?.headers.get("Content-Type")).toBe("image/png");
    expect(res?.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(imageCache.downloadAndPut).not.toHaveBeenCalled();
    expect(fetchFreshUrls).not.toHaveBeenCalled();
  });

  it("downloads from a live origin and serves the full buffer", async () => {
    vi.mocked(imageCache.get)
      .mockReturnValueOnce(null)
      .mockReturnValue({ data: JPEG, contentType: "image/jpeg" });
    vi.mocked(imageCache.downloadAndPut).mockResolvedValue(JPEG);

    const res = await proxyImage(baseParams());

    expect(res?.status).toBe(200);
    expect(res?.headers.get("Content-Type")).toBe("image/jpeg");
    expect(res?.headers.get("Content-Length")).toBe(String(JPEG.length));
    expect(imageCache.downloadAndPut).toHaveBeenCalledWith("song1", DEAD_URL);
    expect(fetchFreshUrls).not.toHaveBeenCalled();
  });

  it("refreshes on a dead origin, heals the row, and serves the fresh image", async () => {
    vi.mocked(imageCache.downloadAndPut)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JPEG);
    vi.mocked(fetchFreshUrls).mockResolvedValue({ audioUrl: FRESH_AUDIO, imageUrl: FRESH_IMAGE });

    const res = await proxyImage(baseParams());

    expect(res?.status).toBe(200);
    expect(imageCache.downloadAndPut).toHaveBeenLastCalledWith("song1", FRESH_IMAGE);
    expect(prisma.song.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "song1" },
        data: expect.objectContaining({ imageUrl: FRESH_IMAGE }),
      }),
    );
  });

  it("never refreshes or overwrites a custom cover", async () => {
    const res = await proxyImage(baseParams({ imageUrlIsCustom: true }));

    expect(res).toBeNull();
    expect(fetchFreshUrls).not.toHaveBeenCalled();
    expect(prisma.song.update).not.toHaveBeenCalled();
  });

  it("never writes audio columns from a cover request (healAudio: false)", async () => {
    // The aggregator can hand back the SAME dead tempfile audioUrl — an image
    // request must not regress a row already healed to the cdn1 derivation
    // (incident 2026-07-17). No usable image -> no write at all.
    vi.mocked(fetchFreshUrls).mockResolvedValue({ audioUrl: FRESH_AUDIO });

    const res = await proxyImage(baseParams());

    expect(res).toBeNull();
    expect(prisma.song.update).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "the row has no imageUrl",
      params: baseParams({ imageUrl: null }),
      setup: () => {},
    },
    {
      name: "the refresh finds nothing",
      params: baseParams(),
      setup: () => vi.mocked(fetchFreshUrls).mockResolvedValue(null),
    },
    {
      name: "the refresh throws",
      params: baseParams(),
      setup: () => vi.mocked(fetchFreshUrls).mockRejectedValue(new Error("boom")),
    },
    {
      name: "the fresh image is dead too",
      params: baseParams(),
      setup: () =>
        vi
          .mocked(fetchFreshUrls)
          .mockResolvedValue({ audioUrl: FRESH_AUDIO, imageUrl: FRESH_IMAGE }),
    },
  ])("returns null (404 path) when $name", async ({ params, setup }) => {
    setup();

    const res = await proxyImage(params);

    expect(res).toBeNull();
  });
});

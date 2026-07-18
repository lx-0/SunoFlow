import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { song: { update: vi.fn() } },
}));
vi.mock("@/lib/cache", () => ({
  audioCache: { has: vi.fn(() => false), put: vi.fn(), getSize: vi.fn(), getStream: vi.fn() },
  imageCache: { has: vi.fn(() => false), downloadAndPut: vi.fn() },
}));
vi.mock("@/lib/sunoapi", () => ({
  fetchFreshUrls: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("@/lib/error-logger", () => ({ logServerError: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { fetchFreshUrls } from "@/lib/sunoapi";
import { logServerError } from "@/lib/error-logger";
import { proxyAudio } from "@/lib/audio";

const DEAD_URL = "https://tempfile.aiquickdraw.com/x/dead.mp3";
const CLIP_ID = "f0da662c-855d-49ed-a86b-199a97e5d419";
const DERIVED = `https://cdn1.suno.ai/${CLIP_ID}.mp3`;
const MP3 = new Uint8Array([0x49, 0x44, 0x33, 0x04]);

function baseParams() {
  return {
    songId: "song1",
    audioUrl: DEAD_URL,
    audioUrlExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    sunoJobId: "job1",
    sunoAudioId: CLIP_ID,
    parentSunoJobId: null,
    resolveApiKey: async () => "key",
    rangeHeader: null,
    cacheControl: "private" as const,
  };
}

describe("proxyAudio derived-cdn fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.song.update).mockResolvedValue({} as never);
    vi.mocked(fetchFreshUrls).mockResolvedValue(null as never);
  });

  it("falls back to the derived cdn1 url when the origin is dead and heals the row", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url) === DERIVED) return new Response(MP3, { status: 200 });
      return new Response("gone", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await proxyAudio(baseParams());

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(fetchMock).toHaveBeenCalledWith(DERIVED);
    expect(prisma.song.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "song1" },
        data: expect.objectContaining({ audioUrl: DERIVED }),
      }),
    );
  });

  it("returns 502 when the derived cdn url is dead too", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("gone", { status: 404 })));

    const res = await proxyAudio(baseParams());

    expect(res.status).toBe(502);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("UPSTREAM_ERROR");
  });

  it("does not touch the fallback when the origin is healthy", async () => {
    const fetchMock = vi.fn(async () => new Response(MP3, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await proxyAudio(baseParams());

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(DEAD_URL);
    expect(prisma.song.update).not.toHaveBeenCalled();
  });

  it("emits the countable fallback event when the derived cdn answers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: RequestInfo | URL) => {
        if (String(url) === DERIVED) return new Response(MP3, { status: 200 });
        return new Response("gone", { status: 404 });
      }),
    );

    await proxyAudio(baseParams());

    expect(logServerError).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logServerError).mock.calls[0][0]).toBe("audio-derived-cdn-fallback");
  });

  it.each([
    { name: "a null expiry", audioUrlExpiresAt: null },
    {
      name: "a stale synthetic TTL",
      audioUrlExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ])(
    "skips the pre-refresh for a permanent cdn1 audioUrl with $name",
    async ({ audioUrlExpiresAt }) => {
      const fetchMock = vi.fn(async () => new Response(MP3, { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);

      const res = await proxyAudio({
        ...baseParams(),
        audioUrl: DERIVED,
        audioUrlExpiresAt,
      });

      expect(res.status).toBe(200);
      expect(fetchFreshUrls).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(DERIVED);
      expect(prisma.song.update).not.toHaveBeenCalled();
    },
  );

  it("still serves the audio when the heal write fails", async () => {
    vi.mocked(prisma.song.update).mockRejectedValue(new Error("db down"));
    vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL) => {
      if (String(url) === DERIVED) return new Response(MP3, { status: 200 });
      return new Response("gone", { status: 404 });
    }));

    const res = await proxyAudio(baseParams());

    expect(res.status).toBe(200);
  });
});

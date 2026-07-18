import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { song: { update: vi.fn() } },
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
import { CDN_URL_TTL_MS } from "@/lib/cdn-constants";
import {
  refreshSongCdnUrls,
  fetchDerivedCdnAudio,
  type RefreshableSong,
} from "@/lib/songs/asset-refresh";

const FRESH_AUDIO = "https://tempfile.aiquickdraw.com/x/fresh.mp3";
const FRESH_IMAGE = "https://tempfile.aiquickdraw.com/x/fresh.jpeg";
const CLIP_ID = "f0da662c-855d-49ed-a86b-199a97e5d419";
const DERIVED = `https://cdn1.suno.ai/${CLIP_ID}.mp3`;
const MP3 = new Uint8Array([0x49, 0x44, 0x33, 0x04]);

function baseSong(overrides: Partial<RefreshableSong> = {}): RefreshableSong {
  return {
    id: "song1",
    sunoJobId: "job1",
    sunoAudioId: CLIP_ID,
    ...overrides,
  };
}

const deps = { resolveApiKey: async () => "key" };

describe("refreshSongCdnUrls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.song.update).mockResolvedValue({} as never);
  });

  it.each([
    {
      name: "heals audio + image for a suno cover",
      song: baseSong(),
      fresh: { audioUrl: FRESH_AUDIO, imageUrl: FRESH_IMAGE },
      expected: { audioUrl: FRESH_AUDIO, imageUrl: FRESH_IMAGE },
      imageWritten: true,
    },
    {
      name: "never returns or writes the image for a custom cover",
      song: baseSong({ imageUrlIsCustom: true }),
      fresh: { audioUrl: FRESH_AUDIO, imageUrl: FRESH_IMAGE },
      expected: { audioUrl: FRESH_AUDIO },
      imageWritten: false,
    },
    {
      name: "omits image keys when the aggregator returns no image",
      song: baseSong(),
      fresh: { audioUrl: FRESH_AUDIO },
      expected: { audioUrl: FRESH_AUDIO },
      imageWritten: false,
    },
  ])("$name", async ({ song, fresh, expected, imageWritten }) => {
    vi.mocked(fetchFreshUrls).mockResolvedValue(fresh);

    const result = await refreshSongCdnUrls(song, deps);

    expect(result).toEqual(expected);
    expect(prisma.song.update).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(prisma.song.update).mock.calls[0][0] as {
      where: { id: string };
      data: Record<string, unknown>;
    };
    expect(arg.where).toEqual({ id: "song1" });
    expect(arg.data.audioUrl).toBe(FRESH_AUDIO);
    expect(arg.data.audioUrlExpiresAt).toBeInstanceOf(Date);
    if (imageWritten) {
      expect(arg.data.imageUrl).toBe(FRESH_IMAGE);
      expect(arg.data.imageUrlExpiresAt).toBeInstanceOf(Date);
    } else {
      expect(arg.data).not.toHaveProperty("imageUrl");
      expect(arg.data).not.toHaveProperty("imageUrlExpiresAt");
    }
  });

  it("stamps audioUrlExpiresAt with the CDN TTL", async () => {
    vi.mocked(fetchFreshUrls).mockResolvedValue({ audioUrl: FRESH_AUDIO });

    const before = Date.now();
    await refreshSongCdnUrls(baseSong(), deps);

    const arg = vi.mocked(prisma.song.update).mock.calls[0][0] as {
      data: { audioUrlExpiresAt: Date };
    };
    expect(arg.data.audioUrlExpiresAt.getTime()).toBeGreaterThanOrEqual(before + CDN_URL_TTL_MS);
  });

  it("stamps audioUrlExpiresAt as null (permanent) when the fresh URL is on cdn1", async () => {
    vi.mocked(fetchFreshUrls).mockResolvedValue({ audioUrl: DERIVED });

    const result = await refreshSongCdnUrls(baseSong(), deps);

    expect(result).toEqual({ audioUrl: DERIVED });
    const arg = vi.mocked(prisma.song.update).mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(arg.data.audioUrl).toBe(DERIVED);
    expect(arg.data.audioUrlExpiresAt).toBeNull();
  });

  it("emits one countable heal event with songId + host on a successful heal", async () => {
    vi.mocked(fetchFreshUrls).mockResolvedValue({ audioUrl: FRESH_AUDIO });

    await refreshSongCdnUrls(baseSong(), deps);

    expect(logServerError).toHaveBeenCalledTimes(1);
    const [source, , context] = vi.mocked(logServerError).mock.calls[0];
    expect(source).toBe("song-cdn-heal");
    expect(context.params?.songId).toBe("song1");
    expect(context.tags?.host).toBe("tempfile.aiquickdraw.com");
  });

  it("keys the lookup by the parent task-id for alternates", async () => {
    vi.mocked(fetchFreshUrls).mockResolvedValue({ audioUrl: FRESH_AUDIO });

    await refreshSongCdnUrls(baseSong({ parentSunoJobId: "parent-task" }), deps);

    expect(fetchFreshUrls).toHaveBeenCalledWith("parent-task", "key", CLIP_ID);
  });

  it.each([
    {
      name: "no task id at all",
      song: baseSong({ sunoJobId: null }),
      setup: () => {},
      fetchCalled: false,
    },
    {
      name: "aggregator returns null",
      song: baseSong(),
      setup: () => vi.mocked(fetchFreshUrls).mockResolvedValue(null),
      fetchCalled: true,
    },
    {
      name: "aggregator returns no audioUrl",
      song: baseSong(),
      setup: () => vi.mocked(fetchFreshUrls).mockResolvedValue({ imageUrl: FRESH_IMAGE }),
      fetchCalled: true,
    },
    {
      name: "fetchFreshUrls throws",
      song: baseSong(),
      setup: () => vi.mocked(fetchFreshUrls).mockRejectedValue(new Error("boom")),
      fetchCalled: true,
    },
  ])("returns null without a heal write when $name", async ({ song, setup, fetchCalled }) => {
    setup();

    const result = await refreshSongCdnUrls(song, deps);

    expect(result).toBeNull();
    expect(prisma.song.update).not.toHaveBeenCalled();
    expect(logServerError).not.toHaveBeenCalled();
    expect(vi.mocked(fetchFreshUrls).mock.calls.length > 0).toBe(fetchCalled);
  });

  it("returns null when the heal write fails", async () => {
    vi.mocked(fetchFreshUrls).mockResolvedValue({ audioUrl: FRESH_AUDIO });
    vi.mocked(prisma.song.update).mockRejectedValue(new Error("db down"));

    const result = await refreshSongCdnUrls(baseSong(), deps);

    expect(result).toBeNull();
  });

  it("heals only the image when the caller opts out of the audio heal", async () => {
    vi.mocked(fetchFreshUrls).mockResolvedValue({ audioUrl: FRESH_AUDIO, imageUrl: FRESH_IMAGE });

    const result = await refreshSongCdnUrls(baseSong(), deps, { healAudio: false });

    expect(result).toEqual({ imageUrl: FRESH_IMAGE });
    expect(result).not.toHaveProperty("audioUrl");
    expect(prisma.song.update).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(prisma.song.update).mock.calls[0][0] as {
      where: { id: string };
      data: Record<string, unknown>;
    };
    expect(arg.where).toEqual({ id: "song1" });
    expect(arg.data.imageUrl).toBe(FRESH_IMAGE);
    expect(arg.data.imageUrlExpiresAt).toBeInstanceOf(Date);
    expect(arg.data).not.toHaveProperty("audioUrl");
    expect(arg.data).not.toHaveProperty("audioUrlExpiresAt");
  });

  it.each([
    {
      name: "the cover is custom",
      song: baseSong({ imageUrlIsCustom: true }),
      fresh: { audioUrl: FRESH_AUDIO, imageUrl: FRESH_IMAGE },
    },
    {
      name: "the aggregator returns no imageUrl",
      song: baseSong(),
      fresh: { audioUrl: FRESH_AUDIO },
    },
  ])("returns null without a write when healAudio is off and $name", async ({ song, fresh }) => {
    vi.mocked(fetchFreshUrls).mockResolvedValue(fresh);

    const result = await refreshSongCdnUrls(song, deps, { healAudio: false });

    expect(result).toBeNull();
    expect(prisma.song.update).not.toHaveBeenCalled();
  });
});

describe("fetchDerivedCdnAudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.song.update).mockResolvedValue({} as never);
  });

  it("returns the derived cdn response and heals the row as permanent (null expiry)", async () => {
    const fetchMock = vi.fn(async () => new Response(MP3, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchDerivedCdnAudio(
      { id: "song1", sunoAudioId: CLIP_ID },
      "https://tempfile.aiquickdraw.com/x/dead.mp3",
    );

    expect(result?.url).toBe(DERIVED);
    expect(result?.response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(DERIVED);
    expect(prisma.song.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "song1" },
        data: { audioUrl: DERIVED, audioUrlExpiresAt: null },
      }),
    );
  });

  it("emits one countable fallback event with songId + hosts when the fallback fires", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(MP3, { status: 200 })));

    await fetchDerivedCdnAudio(
      { id: "song1", sunoAudioId: CLIP_ID },
      "https://tempfile.aiquickdraw.com/x/dead.mp3",
    );

    expect(logServerError).toHaveBeenCalledTimes(1);
    const [source, , context] = vi.mocked(logServerError).mock.calls[0];
    expect(source).toBe("audio-derived-cdn-fallback");
    expect(context.params?.songId).toBe("song1");
    expect(context.tags?.host).toBe("cdn1.suno.ai");
    expect(context.tags?.deadHost).toBe("tempfile.aiquickdraw.com");
  });

  it("still returns the audio when the heal write fails", async () => {
    vi.mocked(prisma.song.update).mockRejectedValue(new Error("db down"));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(MP3, { status: 200 })));

    const result = await fetchDerivedCdnAudio({ id: "song1", sunoAudioId: CLIP_ID });

    expect(result?.url).toBe(DERIVED);
  });

  it.each([
    {
      name: "there is no clip id",
      sunoAudioId: null,
      currentUrl: undefined,
      fetchImpl: async () => new Response(MP3, { status: 200 }),
      fetchCalled: false,
    },
    {
      name: "the current url already is the derived url",
      sunoAudioId: CLIP_ID,
      currentUrl: DERIVED,
      fetchImpl: async () => new Response(MP3, { status: 200 }),
      fetchCalled: false,
    },
    {
      name: "the derived url is dead too",
      sunoAudioId: CLIP_ID,
      currentUrl: undefined,
      fetchImpl: async () => new Response("gone", { status: 404 }),
      fetchCalled: true,
    },
    {
      name: "the derived cdn fetch throws",
      sunoAudioId: CLIP_ID,
      currentUrl: undefined,
      fetchImpl: async () => {
        throw new Error("network down");
      },
      fetchCalled: true,
    },
  ])("returns null when $name", async ({ sunoAudioId, currentUrl, fetchImpl, fetchCalled }) => {
    const fetchMock = vi.fn(fetchImpl);
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchDerivedCdnAudio({ id: "song1", sunoAudioId }, currentUrl);

    expect(result).toBeNull();
    expect(prisma.song.update).not.toHaveBeenCalled();
    expect(logServerError).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.length > 0).toBe(fetchCalled);
  });
});

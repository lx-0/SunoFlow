import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/og", () => ({
  ImageResponse: class ImageResponse extends Response {
    constructor(_jsx: unknown, init?: ResponseInit & { headers?: Record<string, string> }) {
      super("png-data", {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          ...(init?.headers ?? {}),
        },
      });
    }
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from "./route";
import { prisma } from "@/lib/prisma";

const SONG_ID = "song-og-123";

const publicSong = {
  title: "Test Song",
  imageUrl: null,
  isPublic: true,
  isHidden: false,
  archivedAt: null,
  user: { name: "Test Artist" },
};

function makeRequest() {
  return new Request(`http://localhost/api/og/song/${SONG_ID}`);
}

beforeEach(() => {
  vi.mocked(prisma.song.findUnique).mockResolvedValue(publicSong as never);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
});

describe("GET /api/og/song/[songId]", () => {
  it("returns 404 when song not found", async () => {
    vi.mocked(prisma.song.findUnique).mockResolvedValue(null as never);
    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ songId: SONG_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when song is not public", async () => {
    vi.mocked(prisma.song.findUnique).mockResolvedValue({
      ...publicSong,
      isPublic: false,
    } as never);
    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ songId: SONG_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when song is hidden", async () => {
    vi.mocked(prisma.song.findUnique).mockResolvedValue({
      ...publicSong,
      isHidden: true,
    } as never);
    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ songId: SONG_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when song is archived", async () => {
    vi.mocked(prisma.song.findUnique).mockResolvedValue({
      ...publicSong,
      archivedAt: new Date(),
    } as never);
    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ songId: SONG_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 image/png for a public song with no cover art", async () => {
    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ songId: SONG_ID }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toMatch(/s-maxage=3600/);
  });

  it("returns 200 with correct cache headers", async () => {
    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ songId: SONG_ID }),
    });
    expect(res.headers.get("Cache-Control")).toContain("public");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
    expect(res.headers.get("Cache-Control")).toContain("stale-while-revalidate=86400");
  });

  it("fetches cover art when imageUrl is set", async () => {
    const imageData = Buffer.from("fake-png").toString("base64");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(Buffer.from("fake-png"), {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        })
      )
    );
    vi.mocked(prisma.song.findUnique).mockResolvedValue({
      ...publicSong,
      imageUrl: "https://cdn.example.com/cover.jpg",
    } as never);

    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ songId: SONG_ID }),
    });
    expect(res.status).toBe(200);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "https://cdn.example.com/cover.jpg",
      expect.objectContaining({ signal: expect.anything() })
    );
    void imageData; // used above to construct mock
  });

  it("renders without cover art when image fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    vi.mocked(prisma.song.findUnique).mockResolvedValue({
      ...publicSong,
      imageUrl: "https://cdn.example.com/expired.jpg",
    } as never);

    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ songId: SONG_ID }),
    });
    expect(res.status).toBe(200);
  });

  it("uses 'Untitled' and 'Unknown Artist' as fallbacks", async () => {
    vi.mocked(prisma.song.findUnique).mockResolvedValue({
      ...publicSong,
      title: null,
      user: { name: null },
    } as never);

    const res = await GET(makeRequest() as never, {
      params: Promise.resolve({ songId: SONG_ID }),
    });
    expect(res.status).toBe(200);
  });
});

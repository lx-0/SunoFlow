import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  get AUTH_SECRET() { return "test-secret"; },
  get NEXTAUTH_URL() { return "http://localhost:3000"; },
  get RATE_LIMIT_MAX_GENERATIONS() { return 10; },
  env: {},
}));

vi.mock("@/lib/auth", () => ({
  resolveUser: vi.fn(),
}));

vi.mock("@/lib/error-logger", () => ({
  logServerError: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  acquireRateLimitSlot: vi.fn(),
  acquireAnonRateLimitSlot: vi.fn(),
}));

vi.mock("@/lib/songs", () => ({
  prepareSongDownload: vi.fn(),
}));

import { resolveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { acquireRateLimitSlot } from "@/lib/rate-limit";
import { prepareSongDownload } from "@/lib/songs";

const seg = { params: Promise.resolve({ id: "song-1" }) };

function makeRequest(url: string) {
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUser).mockResolvedValue({
    userId: "user-1",
    isApiKey: false,
    isAdmin: false,
    error: null,
  });
  vi.mocked(prisma.song.findFirst).mockResolvedValue({
    id: "song-1",
    userId: "user-1",
    title: "Track 1",
    audioUrl: "https://example.com/track.wav",
    imageUrl: null,
    tags: null,
    prompt: null,
    createdAt: new Date("2026-01-01"),
  } as never);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Artist" } as never);
  vi.mocked(acquireRateLimitSlot).mockResolvedValue({
    acquired: true,
    status: { remaining: 49, resetAt: "2026-01-01T00:00:00.000Z" },
  } as never);
  vi.mocked(prepareSongDownload).mockResolvedValue({
    ok: true,
    buffer: new Uint8Array([1, 2, 3]).buffer,
    contentType: "audio/wav",
    filename: "track-1.wav",
  });
});

describe("GET /api/songs/[id]/download", () => {
  it("uses parsed query values from the route pipeline", async () => {
    const res = await GET(
      makeRequest("http://localhost/api/songs/song-1/download?format=wav&metadata=false"),
      seg,
    );

    expect(res.status).toBe(200);
    expect(prepareSongDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedFormat: "wav",
        embedMetadata: false,
      }),
    );
  });

  it("applies query defaults when params are omitted", async () => {
    const res = await GET(makeRequest("http://localhost/api/songs/song-1/download"), seg);

    expect(res.status).toBe(200);
    expect(prepareSongDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedFormat: "native",
        embedMetadata: true,
      }),
    );
  });

  it("returns 400 for invalid format query value", async () => {
    const res = await GET(
      makeRequest("http://localhost/api/songs/song-1/download?format=ogg"),
      seg,
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(prepareSongDownload).not.toHaveBeenCalled();
  });
});

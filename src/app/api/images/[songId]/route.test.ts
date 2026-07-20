import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  get AUTH_SECRET() { return "test-secret"; },
  get NEXTAUTH_URL() { return "http://localhost:3000"; },
  get RATE_LIMIT_MAX_GENERATIONS() { return 10; },
  env: {},
}));

vi.mock("@/lib/auth", () => ({
  resolveUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/sunoapi", () => ({
  resolveUserApiKey: vi.fn().mockResolvedValue("test-key"),
}));

vi.mock("@/lib/images/proxy", () => ({
  proxyImage: vi.fn().mockResolvedValue(
    new Response("image-bytes", { status: 200, headers: { "Content-Type": "image/jpeg" } }),
  ),
}));

vi.mock("@/lib/error-logger", () => ({
  logServerError: vi.fn(),
}));

import { GET } from "./route";
import { resolveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { proxyImage } from "@/lib/images/proxy";

function makeRequest() {
  return new NextRequest("http://localhost/api/images/song-1");
}

const seg = { params: Promise.resolve({ songId: "song-1" }) };

function makeSong(overrides: Record<string, unknown> = {}) {
  return {
    imageUrl: "https://example.com/art.jpg",
    imageUrlIsCustom: false,
    sunoJobId: "job-1",
    sunoAudioId: "audio-1",
    userId: "owner-1",
    isPublic: false,
    isHidden: false,
    archivedAt: null,
    parentSong: null,
    ...overrides,
  };
}

function asAnon() {
  vi.mocked(resolveUser).mockResolvedValue({
    userId: null,
    isApiKey: false,
    isAdmin: false,
    error: NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 }),
  } as never);
}

function asUser(userId: string) {
  vi.mocked(resolveUser).mockResolvedValue({
    userId,
    isApiKey: false,
    isAdmin: false,
    error: null,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/images/[songId] visibility gate", () => {
  it("returns 404 for an anonymous request to a private song's image", async () => {
    asAnon();
    vi.mocked(prisma.song.findUnique).mockResolvedValue(makeSong({ isPublic: false }) as never);

    const res = await GET(makeRequest(), seg);

    expect(res.status).toBe(404);
    expect(proxyImage).not.toHaveBeenCalled();
  });

  it("returns 200 to the owner requesting their own private song's image", async () => {
    asUser("owner-1");
    vi.mocked(prisma.song.findUnique).mockResolvedValue(makeSong({ isPublic: false }) as never);

    const res = await GET(makeRequest(), seg);

    expect(res.status).toBe(200);
    expect(proxyImage).toHaveBeenCalledOnce();
  });

  it("returns 200 for an anonymous request to a public, non-hidden, non-archived song's image", async () => {
    asAnon();
    vi.mocked(prisma.song.findUnique).mockResolvedValue(
      makeSong({ isPublic: true, isHidden: false, archivedAt: null }) as never,
    );

    const res = await GET(makeRequest(), seg);

    expect(res.status).toBe(200);
    expect(proxyImage).toHaveBeenCalledOnce();
  });

  it("returns 404 for an anonymous request to a hidden song's image even if public", async () => {
    asAnon();
    vi.mocked(prisma.song.findUnique).mockResolvedValue(
      makeSong({ isPublic: true, isHidden: true }) as never,
    );

    const res = await GET(makeRequest(), seg);

    expect(res.status).toBe(404);
    expect(proxyImage).not.toHaveBeenCalled();
  });

  it("returns 404 for a non-owner authenticated user requesting another user's private image", async () => {
    asUser("intruder-2");
    vi.mocked(prisma.song.findUnique).mockResolvedValue(makeSong({ isPublic: false }) as never);

    const res = await GET(makeRequest(), seg);

    expect(res.status).toBe(404);
    expect(proxyImage).not.toHaveBeenCalled();
  });

  it("returns 404 when the song does not exist", async () => {
    asAnon();
    vi.mocked(prisma.song.findUnique).mockResolvedValue(null as never);

    const res = await GET(makeRequest(), seg);

    expect(res.status).toBe(404);
    expect(proxyImage).not.toHaveBeenCalled();
  });
});

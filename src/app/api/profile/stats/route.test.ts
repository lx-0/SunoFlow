import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET } from "./route";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  get AUTH_SECRET() { return "test-secret"; },
  get NEXTAUTH_URL() { return "http://localhost:3000"; },
  get SUNOAPI_KEY() { return "test-key"; },
  get SUNO_API_TIMEOUT_MS() { return 30000; },
  get RATE_LIMIT_MAX_GENERATIONS() { return 10; },
  env: {},
}));

vi.mock("@/lib/auth", () => ({
  resolveUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    song: { count: vi.fn() },
    playlist: { count: vi.fn() },
    promptTemplate: { count: vi.fn() },
  },
}));

vi.mock("@/lib/error-logger", () => ({
  logServerError: vi.fn(),
}));

import { resolveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const seg = { params: Promise.resolve({}) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUser).mockResolvedValue({
    userId: "user-1",
    isApiKey: false,
    isAdmin: false,
    error: null,
  });
  vi.mocked(prisma.song.count).mockResolvedValue(0);
  vi.mocked(prisma.playlist.count).mockResolvedValue(0);
  vi.mocked(prisma.promptTemplate.count).mockResolvedValue(0);
});

describe("GET /api/profile/stats", () => {
  it("returns computed profile stats", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const lastLoginAt = new Date("2026-05-21T00:00:00.000Z");

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      createdAt,
      lastLoginAt,
      _count: { followers: 3, following: 4 },
    } as never);
    vi.mocked(prisma.song.count)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(2);
    vi.mocked(prisma.playlist.count).mockResolvedValue(5);
    vi.mocked(prisma.promptTemplate.count).mockResolvedValue(6);

    const res = await GET(new NextRequest("http://localhost/api/profile/stats"), seg);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.totalSongs).toBe(7);
    expect(data.totalFavorites).toBe(2);
    expect(data.totalPlaylists).toBe(5);
    expect(data.totalTemplates).toBe(6);
    expect(data.followersCount).toBe(3);
    expect(data.followingCount).toBe(4);
    expect(data.memberSince).toBe(createdAt.toISOString());
    expect(data.lastLoginAt).toBe(lastLoginAt.toISOString());
  });

  it("returns 404 when user record is missing", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

    const res = await GET(new NextRequest("http://localhost/api/profile/stats"), seg);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "User not found", code: "NOT_FOUND" });
  });

  it("returns auth error when unauthenticated", async () => {
    vi.mocked(resolveUser).mockResolvedValue({
      userId: null,
      isApiKey: false,
      isAdmin: false,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as never,
    });

    const res = await GET(new NextRequest("http://localhost/api/profile/stats"), seg);
    expect(res.status).toBe(401);
  });
});

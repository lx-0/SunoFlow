import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { PATCH } from "./route";
import { success } from "@/lib/result";

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
}));

vi.mock("@/lib/songs", () => ({
  findUserSong: vi.fn(),
  updateSongMetadata: vi.fn(),
}));

vi.mock("@/lib/error-logger", () => ({
  logServerError: vi.fn(),
}));

import { resolveUser } from "@/lib/auth";
import { updateSongMetadata } from "@/lib/songs";

const SONG_ID = "song-123";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/songs/${SONG_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(resolveUser).mockResolvedValue({ userId: "user-1", isApiKey: false, isAdmin: false, error: null });
  vi.mocked(updateSongMetadata).mockResolvedValue(
    success({ visibility: "private", isPublic: false, publicSlug: null, title: "Old title" }),
  );
});

describe("PATCH /api/songs/[id]", () => {
  it("updates title", async () => {
    vi.mocked(updateSongMetadata).mockResolvedValue(
      success({ visibility: "private", isPublic: false, publicSlug: null, title: "New title" }),
    );

    const res = await PATCH(makeRequest({ title: "New title" }), { params: Promise.resolve({ id: SONG_ID }) });

    expect(res.status).toBe(200);
    expect(updateSongMetadata).toHaveBeenCalledWith(SONG_ID, "user-1", { title: "New title" });
    const json = await res.json();
    expect(json.title).toBe("New title");
  });

  it("updates visibility and title together", async () => {
    const res = await PATCH(makeRequest({ visibility: "public", title: "Shared track" }), {
      params: Promise.resolve({ id: SONG_ID }),
    });

    expect(res.status).toBe(200);
    expect(updateSongMetadata).toHaveBeenCalledWith(SONG_ID, "user-1", {
      visibility: "public",
      title: "Shared track",
    });
  });

  it("rejects empty patch bodies", async () => {
    const res = await PATCH(makeRequest({}), { params: Promise.resolve({ id: SONG_ID }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(resolveUser).mockResolvedValue({
      userId: null,
      isApiKey: false,
      isAdmin: false,
      error: NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 }),
    });

    const res = await PATCH(makeRequest({ title: "Nope" }), { params: Promise.resolve({ id: SONG_ID }) });
    expect(res.status).toBe(401);
  });
});

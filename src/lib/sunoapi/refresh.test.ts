import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  get AUTH_SECRET() { return "test-secret"; },
  get NEXTAUTH_URL() { return "http://localhost:3000"; },
  get SUNOAPI_KEY() { return "test-key"; },
  get SUNO_API_TIMEOUT_MS() { return 30000; },
  get RATE_LIMIT_MAX_GENERATIONS() { return 10; },
  get WEBHOOK_BASE_URL() { return "http://localhost:3000"; },
  get SUNO_WEBHOOK_SECRET() { return "test"; },
  env: {},
}));

import { fetchFreshUrls } from "./refresh";

function mockFetchOnce(body: unknown, status = 200): void {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchFreshUrls", () => {
  const taskId = "task-abc";
  const primaryClip = {
    id: "clip-primary",
    audio_url: "https://cdn/primary.mp3",
    image_url: "https://cdn/primary.jpg",
  };
  const alternateClip = {
    id: "clip-alternate",
    audio_url: "https://cdn/alternate.mp3",
    image_url: "https://cdn/alternate.jpg",
  };
  const recordInfo = {
    data: { response: { sunoData: [primaryClip, alternateClip] } },
  };

  it("matches the requested clip by sunoAudioId, not the first clip with a URL", async () => {
    mockFetchOnce(recordInfo);
    const result = await fetchFreshUrls(taskId, "k", "clip-alternate");
    expect(result).toEqual({
      audioUrl: "https://cdn/alternate.mp3",
      imageUrl: "https://cdn/alternate.jpg",
    });
  });

  it("falls back to first-with-URL when sunoAudioId is not provided", async () => {
    mockFetchOnce(recordInfo);
    const result = await fetchFreshUrls(taskId, "k");
    expect(result).toEqual({
      audioUrl: "https://cdn/primary.mp3",
      imageUrl: "https://cdn/primary.jpg",
    });
  });

  it("falls back to /songs/<sunoAudioId> when record-info returns no matching clip", async () => {
    mockFetchOnce({ data: { response: { sunoData: [primaryClip] } } });
    mockFetchOnce({ clip: { audio_url: "https://cdn/alt-from-songs.mp3" } });
    const result = await fetchFreshUrls(taskId, "k", "clip-missing");
    expect(result).toEqual({ audioUrl: "https://cdn/alt-from-songs.mp3" });
  });
});

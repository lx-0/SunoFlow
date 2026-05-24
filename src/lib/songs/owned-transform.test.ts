import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/songs/ownership", () => ({
  requireOwnedSong: vi.fn(),
}));

vi.mock("@/lib/sunoapi", () => ({
  resolveUserApiKey: vi.fn(),
}));

vi.mock("@/lib/song-transform-guards", () => ({
  validateSongTransformPrerequisites: vi.fn(),
}));

vi.mock("@/lib/generation", () => ({
  executeTransform: vi.fn(),
  respondToTransform: vi.fn(),
}));

import { requireOwnedSong } from "@/lib/songs/ownership";
import { resolveUserApiKey } from "@/lib/sunoapi";
import { validateSongTransformPrerequisites } from "@/lib/song-transform-guards";
import { executeTransform, respondToTransform } from "@/lib/generation";
import { runOwnedSongTransform } from "@/lib/songs/owned-transform";

const makeResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const baseOptions = {
  songId: "song-1",
  userId: "user-1",
  route: "/api/songs/song-1/convert-wav",
  logLabel: "convert-wav-api",
  format: "wav",
  mockTaskId: "mock-wav-song-1",
  notReadyMessage: "Song must be fully generated before converting to WAV.",
  missingIdentifiersMessage: "Song is missing Suno identifiers for WAV conversion.",
  fallbackErrorMessage: "WAV conversion failed. Please try again.",
  apiCall: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SUNOAPI_KEY = "env-key";
});

describe("runOwnedSongTransform", () => {
  it("returns ownership error response immediately", async () => {
    const forbidden = makeResponse({ error: "forbidden" }, 403);
    vi.mocked(requireOwnedSong).mockResolvedValue({ data: null, error: forbidden });

    const result = await runOwnedSongTransform(baseOptions);

    expect(result).toBe(forbidden);
    expect(executeTransform).not.toHaveBeenCalled();
  });

  it("returns validation error response immediately", async () => {
    vi.mocked(requireOwnedSong).mockResolvedValue({
      data: { id: "song-1", sunoJobId: "task-1", sunoAudioId: "audio-1" } as never,
      error: null,
    });
    vi.mocked(resolveUserApiKey).mockResolvedValue(undefined);
    const invalid = makeResponse({ error: "invalid" }, 400);
    vi.mocked(validateSongTransformPrerequisites).mockReturnValue(invalid);

    const result = await runOwnedSongTransform(baseOptions);

    expect(result).toBe(invalid);
    expect(executeTransform).not.toHaveBeenCalled();
  });

  it("executes transform and responds with helper payload", async () => {
    vi.mocked(requireOwnedSong).mockResolvedValue({
      data: { id: "song-1", sunoJobId: "task-1", sunoAudioId: "audio-1" } as never,
      error: null,
    });
    vi.mocked(resolveUserApiKey).mockResolvedValue("user-key");
    vi.mocked(validateSongTransformPrerequisites).mockReturnValue(null);
    baseOptions.apiCall.mockResolvedValue({ taskId: "transform-task-1" });
    vi.mocked(executeTransform).mockResolvedValue({ ok: true, taskId: "transform-task-1" } as never);
    const success = makeResponse({ ok: true }, 200);
    vi.mocked(respondToTransform).mockReturnValue(success);

    const result = await runOwnedSongTransform(baseOptions);

    expect(executeTransform).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        action: "generate",
        hasApiKey: true,
        mockTaskId: "mock-wav-song-1",
        fallbackErrorMessage: "WAV conversion failed. Please try again.",
        apiCall: expect.any(Function),
      }),
    );

    const executeCall = vi.mocked(executeTransform).mock.calls[0][0];
    await executeCall.apiCall();
    expect(baseOptions.apiCall).toHaveBeenCalledWith(
      { taskId: "task-1", audioId: "audio-1" },
      "user-key",
    );

    expect(respondToTransform).toHaveBeenCalledWith(
      { ok: true, taskId: "transform-task-1" },
      { label: "convert-wav-api", userId: "user-1", route: "/api/songs/song-1/convert-wav" },
      { songId: "song-1", format: "wav" },
    );
    expect(result).toBe(success);
  });
});

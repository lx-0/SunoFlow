import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  env: {},
}));

vi.mock("@/lib/notifications", () => ({
  notifyFollowersOfNewSong: vi.fn().mockResolvedValue(undefined),
  notifyUser: vi.fn().mockResolvedValue(undefined),
}));

import { notifyFollowersOfNewSong, notifyUser } from "@/lib/notifications";
import { notifyAboutReadySong } from "./notify";
import type { SongReadyContext } from "./types";

function ctx(overrides: Partial<SongReadyContext> = {}): SongReadyContext {
  return {
    song: {
      id: "song-1", userId: "user-1", prompt: null, tags: null,
      audioUrl: null, audioUrlExpiresAt: null,
      imageUrl: null, imageUrlExpiresAt: null,
      duration: null, lyrics: null, title: null, sunoModel: null,
      isInstrumental: false, pollCount: 1,
    },
    updated: { id: "song-1", title: "My Song", audioUrl: null, imageUrl: null },
    firstSong: {},
    alternates: [],
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("notifyAboutReadySong", () => {
  it("fires follower fanout + creator notification", async () => {
    await notifyAboutReadySong(ctx());
    expect(notifyFollowersOfNewSong).toHaveBeenCalledWith("user-1", "song-1");
    expect(notifyUser).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      type: "generation_complete",
      songId: "song-1",
      push: { tag: "generation-complete-song-1" },
    }));
  });

  it("uses the persisted title in the user-facing message", async () => {
    await notifyAboutReadySong(ctx());
    expect(notifyUser).toHaveBeenCalledWith(expect.objectContaining({
      message: '"My Song" has finished generating',
    }));
  });

  it("falls back to 'Untitled' when the persisted song has no title", async () => {
    await notifyAboutReadySong(ctx({
      updated: { id: "song-1", title: null, audioUrl: null, imageUrl: null },
    }));
    expect(notifyUser).toHaveBeenCalledWith(expect.objectContaining({
      message: '"Untitled" has finished generating',
    }));
  });

  it("isolates per-channel failure — a follower-fanout throw must not silence the creator", async () => {
    vi.mocked(notifyFollowersOfNewSong).mockRejectedValueOnce(new Error("fanout down"));
    await expect(notifyAboutReadySong(ctx())).resolves.not.toThrow();
    expect(notifyUser).toHaveBeenCalled();
  });
});

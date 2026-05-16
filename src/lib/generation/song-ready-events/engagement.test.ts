import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  env: {},
}));

vi.mock("@/lib/activity", () => ({ recordActivity: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/streaks", () => ({
  recordDailyActivity: vi.fn().mockResolvedValue(3),
  checkStreakMilestones: vi.fn().mockResolvedValue(undefined),
  checkSongMilestones: vi.fn().mockResolvedValue(undefined),
}));

import { recordActivity } from "@/lib/activity";
import { recordDailyActivity, checkStreakMilestones, checkSongMilestones } from "@/lib/streaks";
import { recordSongReadyEngagement } from "./engagement";
import type { SongReadyContext } from "./types";

const ctx: SongReadyContext = {
  song: {
    id: "song-1", userId: "user-1", prompt: null, tags: null,
    audioUrl: null, audioUrlExpiresAt: null,
    imageUrl: null, imageUrlExpiresAt: null,
    duration: null, lyrics: null, title: null, sunoModel: null,
    isInstrumental: false, pollCount: 1,
  },
  updated: { id: "song-1", title: null, audioUrl: null, imageUrl: null },
  firstSong: {},
  alternates: [],
};

beforeEach(() => vi.clearAllMocks());

describe("recordSongReadyEngagement", () => {
  it("fires all three engagement signals in parallel", async () => {
    await recordSongReadyEngagement(ctx);
    expect(recordActivity).toHaveBeenCalledWith({
      userId: "user-1", type: "song_created", songId: "song-1",
    });
    expect(recordDailyActivity).toHaveBeenCalledWith("user-1");
    expect(checkSongMilestones).toHaveBeenCalledWith("user-1");
  });

  it("threads the new streak value from recordDailyActivity into checkStreakMilestones", async () => {
    vi.mocked(recordDailyActivity).mockResolvedValueOnce(7);
    await recordSongReadyEngagement(ctx);
    expect(checkStreakMilestones).toHaveBeenCalledWith("user-1", 7);
  });

  it("isolates per-signal failure — activity throwing doesn't cancel streak or milestones", async () => {
    vi.mocked(recordActivity).mockRejectedValueOnce(new Error("DB down"));
    await expect(recordSongReadyEngagement(ctx)).resolves.not.toThrow();
    expect(recordDailyActivity).toHaveBeenCalled();
    expect(checkSongMilestones).toHaveBeenCalled();
  });

  it("isolates the streak chain — recordDailyActivity throwing skips checkStreakMilestones but not other signals", async () => {
    vi.mocked(recordDailyActivity).mockRejectedValueOnce(new Error("DB down"));
    await expect(recordSongReadyEngagement(ctx)).resolves.not.toThrow();
    expect(checkStreakMilestones).not.toHaveBeenCalled();
    expect(recordActivity).toHaveBeenCalled();
    expect(checkSongMilestones).toHaveBeenCalled();
  });
});

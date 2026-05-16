import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  env: {},
}));

vi.mock("@/lib/event-bus", () => ({ broadcast: vi.fn() }));

import { broadcast } from "@/lib/event-bus";
import { broadcastSongReady } from "./broadcast";
import type { SongReadyContext } from "./types";

function ctx(overrides: Partial<SongReadyContext> = {}): SongReadyContext {
  return {
    song: {
      id: "song-1",
      userId: "user-1",
      prompt: "p",
      tags: "t",
      audioUrl: null,
      audioUrlExpiresAt: null,
      imageUrl: null,
      imageUrlExpiresAt: null,
      duration: null,
      lyrics: null,
      title: "Title",
      sunoModel: null,
      isInstrumental: false,
      pollCount: 1,
    },
    updated: {
      id: "song-1",
      title: "Title",
      audioUrl: "https://example.com/a.mp3",
      imageUrl: "https://example.com/i.jpg",
    },
    firstSong: {},
    alternates: [],
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("broadcastSongReady", () => {
  it("emits primary generation_update + queue_item_complete for a single-clip song", () => {
    broadcastSongReady(ctx());
    expect(broadcast).toHaveBeenCalledTimes(2);
    expect(broadcast).toHaveBeenCalledWith("user-1", expect.objectContaining({
      type: "generation_update",
      data: expect.objectContaining({ songId: "song-1", status: "ready", alternateCount: 0 }),
    }));
    expect(broadcast).toHaveBeenCalledWith("user-1", {
      type: "queue_item_complete",
      data: { songId: "song-1" },
    });
  });

  it("emits one event per alternate plus the primary plus the queue event", () => {
    broadcastSongReady(ctx({
      alternates: [
        { id: "alt-1", parentSongId: "song-1", title: "Alt 1", audioUrl: "a1", imageUrl: "i1", audioSource: {} },
        { id: "alt-2", parentSongId: "song-1", title: "Alt 2", audioUrl: "a2", imageUrl: "i2", audioSource: {} },
      ],
    }));
    expect(broadcast).toHaveBeenCalledTimes(4); // 2 alts + 1 primary + 1 queue
    const altCalls = vi.mocked(broadcast).mock.calls.filter(
      ([, msg]) => msg.type === "generation_update" && "parentSongId" in msg.data,
    );
    expect(altCalls).toHaveLength(2);
    expect(altCalls[0][1].data).toMatchObject({ songId: "alt-1", parentSongId: "song-1" });
    expect(altCalls[1][1].data).toMatchObject({ songId: "alt-2", parentSongId: "song-1" });
  });

  it("includes alternateCount on the primary event", () => {
    broadcastSongReady(ctx({
      alternates: [
        { id: "alt-1", parentSongId: "song-1", title: null, audioUrl: null, imageUrl: null, audioSource: {} },
        { id: "alt-2", parentSongId: "song-1", title: null, audioUrl: null, imageUrl: null, audioSource: {} },
      ],
    }));
    const primary = vi.mocked(broadcast).mock.calls.find(
      ([, m]) => m.type === "generation_update" && m.data.songId === "song-1",
    );
    expect(primary?.[1].data).toMatchObject({ alternateCount: 2 });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jamSessionEntry: { findMany: vi.fn() },
    playHistory: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getJamSessionSignal, hasJamSessionSignal } from "./session-signal";

const entry = (over: Partial<{ promptText: string; status: string; songId: string | null }>) => ({
  promptText: "a prompt",
  status: "ready",
  songId: "song-1",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.playHistory.findMany).mockResolvedValue([] as never);
});

describe("getJamSessionSignal", () => {
  it("counts a prompt as landing only when its song was actually played", async () => {
    vi.mocked(prisma.jamSessionEntry.findMany).mockResolvedValue([
      entry({ promptText: "played one", songId: "song-played" }),
      entry({ promptText: "never played", songId: "song-idle" }),
    ] as never);
    vi.mocked(prisma.playHistory.findMany).mockResolvedValue([
      { songId: "song-played" },
    ] as never);

    const signal = await getJamSessionSignal("jam-1", "host-1");

    // "ready" alone is not preference information — every accepted prompt
    // reaches ready, so only playback distinguishes.
    expect(signal.landed).toEqual(["played one"]);
  });

  it("reads playback from the host's history, since the party plays on their queue", async () => {
    vi.mocked(prisma.jamSessionEntry.findMany).mockResolvedValue([
      entry({ songId: "song-1" }),
    ] as never);

    await getJamSessionSignal("jam-1", "host-1");

    expect(vi.mocked(prisma.playHistory.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: { userId: "host-1", songId: { in: ["song-1"] } },
    });
  });

  it("collects vetoed prompts as the negative signal", async () => {
    vi.mocked(prisma.jamSessionEntry.findMany).mockResolvedValue([
      entry({ promptText: "killed it", status: "vetoed" }),
      entry({ promptText: "fine", status: "ready" }),
    ] as never);

    const signal = await getJamSessionSignal("jam-1", "host-1");

    expect(signal.rejected).toEqual(["killed it"]);
  });

  it("ignores failed generations — an upstream error is not a taste signal", async () => {
    vi.mocked(prisma.jamSessionEntry.findMany).mockResolvedValue([
      entry({ promptText: "upstream died", status: "failed" }),
    ] as never);

    const signal = await getJamSessionSignal("jam-1", "host-1");

    expect(signal.landed).toEqual([]);
    expect(signal.rejected).toEqual([]);
    expect(hasJamSessionSignal(signal)).toBe(false);
  });

  it("skips the playback query entirely when nothing is ready yet", async () => {
    vi.mocked(prisma.jamSessionEntry.findMany).mockResolvedValue([
      entry({ status: "pending" }),
    ] as never);

    await getJamSessionSignal("jam-1", "host-1");

    expect(prisma.playHistory.findMany).not.toHaveBeenCalled();
  });

  it("caps each list so one outlier cannot dominate the rewrite", async () => {
    vi.mocked(prisma.jamSessionEntry.findMany).mockResolvedValue(
      Array.from({ length: 20 }, (_, i) =>
        entry({ promptText: `veto ${i}`, status: "vetoed" }),
      ) as never,
    );

    const signal = await getJamSessionSignal("jam-1", "host-1");

    expect(signal.rejected).toHaveLength(8);
  });
});

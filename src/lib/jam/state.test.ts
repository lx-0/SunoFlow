import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jamSession: { findUnique: vi.fn() },
    playbackState: { findUnique: vi.fn() },
    playlistSong: { findFirst: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getJamSessionState } from "./state";

const SONG = {
  id: "song-1",
  title: "Pizza Disco",
  imageUrl: null,
  duration: 180,
  generationStatus: "ready",
};

const SESSION_ROW = {
  id: "jam-1",
  status: "open",
  budgetTotal: 30,
  budgetUsed: 4,
  hostUserId: "host-1",
  playlistId: "pl-1",
  playlist: { name: "Jam Session 2026-07-22" },
  host: { name: "Alex" },
  entries: [
    {
      id: "entry-1",
      status: "pending",
      promptText: "italo disco about cold pizza",
      guestName: "Ken",
      createdAt: new Date("2026-07-22T20:00:00Z"),
      song: { ...SONG, generationStatus: "pending" },
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.jamSession.findUnique).mockResolvedValue(SESSION_ROW as never);
  vi.mocked(prisma.playbackState.findUnique).mockResolvedValue(null as never);
});

describe("getJamSessionState", () => {
  it("404s for unknown tokens", async () => {
    vi.mocked(prisma.jamSession.findUnique).mockResolvedValue(null as never);

    const result = await getJamSessionState("nope");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("returns a guest-safe state with entries and budget", async () => {
    const result = await getJamSessionState("tok-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.session).toEqual({
      id: "jam-1",
      name: "Jam Session 2026-07-22",
      hostName: "Alex",
      status: "open",
      budgetTotal: 30,
      budgetUsed: 4,
    });
    expect(result.data.entries).toHaveLength(1);
    expect(result.data.nowPlaying).toBeNull();
    // Guest surface must stay lean — no internals on the song card.
    const song = result.data.entries[0].song;
    expect(song).not.toBeNull();
    expect(Object.keys(song ?? {}).sort()).toEqual(
      ["duration", "generationStatus", "id", "imageUrl", "title"].sort(),
    );
  });

  it("queries entries excluding vetoed ones", async () => {
    await getJamSessionState("tok-1");

    expect(prisma.jamSession.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          entries: expect.objectContaining({
            where: { status: { not: "vetoed" } },
          }),
        }),
      }),
    );
  });

  it("reports nowPlaying only when the host plays a session-playlist song", async () => {
    vi.mocked(prisma.playbackState.findUnique).mockResolvedValue({
      songId: "song-1",
      position: 42.5,
      song: SONG,
    } as never);
    vi.mocked(prisma.playlistSong.findFirst).mockResolvedValue({ id: "ps-1" } as never);

    const result = await getJamSessionState("tok-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.nowPlaying).toEqual({ song: SONG, position: 42.5 });
  });

  it("suppresses nowPlaying when the host plays something else", async () => {
    vi.mocked(prisma.playbackState.findUnique).mockResolvedValue({
      songId: "song-9",
      position: 10,
      song: { ...SONG, id: "song-9" },
    } as never);
    vi.mocked(prisma.playlistSong.findFirst).mockResolvedValue(null as never);

    const result = await getJamSessionState("tok-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.nowPlaying).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jamSessionEntry: { findUnique: vi.fn(), update: vi.fn() },
    playlistSong: { create: vi.fn(), count: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { syncJamEntryOnCompletion } from "./completion";

const PENDING_ENTRY = {
  id: "entry-1",
  status: "pending",
  session: { playlistId: "pl-1" },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.jamSessionEntry.findUnique).mockResolvedValue(
    PENDING_ENTRY as never,
  );
  vi.mocked(prisma.playlistSong.count).mockResolvedValue(3 as never);
  vi.mocked(prisma.playlistSong.create).mockResolvedValue({ id: "ps-1" } as never);
});

describe("syncJamEntryOnCompletion", () => {
  it("is a no-op for non-jam songs", async () => {
    vi.mocked(prisma.jamSessionEntry.findUnique).mockResolvedValue(null as never);

    await syncJamEntryOnCompletion("song-1", "ready");

    expect(prisma.playlistSong.create).not.toHaveBeenCalled();
    expect(prisma.jamSessionEntry.update).not.toHaveBeenCalled();
  });

  it("leaves vetoed entries untouched — their songs never join the playlist", async () => {
    vi.mocked(prisma.jamSessionEntry.findUnique).mockResolvedValue({
      ...PENDING_ENTRY,
      status: "vetoed",
    } as never);

    await syncJamEntryOnCompletion("song-1", "ready");

    expect(prisma.playlistSong.create).not.toHaveBeenCalled();
    expect(prisma.jamSessionEntry.update).not.toHaveBeenCalled();
  });

  it("appends the song to the session playlist and flips the entry to ready", async () => {
    await syncJamEntryOnCompletion("song-1", "ready");

    expect(prisma.playlistSong.create).toHaveBeenCalledWith({
      data: { playlistId: "pl-1", songId: "song-1", position: 3 },
    });
    expect(prisma.jamSessionEntry.update).toHaveBeenCalledWith({
      where: { id: "entry-1" },
      data: { status: "ready" },
    });
  });

  it("tolerates a concurrent playlist insert (P2002)", async () => {
    vi.mocked(prisma.playlistSong.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await syncJamEntryOnCompletion("song-1", "ready");

    expect(prisma.jamSessionEntry.update).toHaveBeenCalledWith({
      where: { id: "entry-1" },
      data: { status: "ready" },
    });
  });

  it("marks the entry failed without touching the playlist", async () => {
    await syncJamEntryOnCompletion("song-1", "failed");

    expect(prisma.playlistSong.create).not.toHaveBeenCalled();
    expect(prisma.jamSessionEntry.update).toHaveBeenCalledWith({
      where: { id: "entry-1" },
      data: { status: "failed" },
    });
  });
});

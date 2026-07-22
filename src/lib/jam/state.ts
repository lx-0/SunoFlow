import { prisma } from "@/lib/prisma";
import { Err, type Result, success } from "@/lib/result";

/** Lean, guest-safe song card — nothing beyond what the party screen shows. */
export interface JamSongCard {
  id: string;
  title: string | null;
  imageUrl: string | null;
  duration: number | null;
  generationStatus: string;
}

export interface JamEntryCard {
  id: string;
  status: string;
  promptText: string;
  guestName: string | null;
  createdAt: Date;
  song: JamSongCard | null;
}

export interface JamSessionState {
  session: {
    id: string;
    name: string;
    hostName: string | null;
    status: string;
    budgetTotal: number;
    budgetUsed: number;
  };
  nowPlaying: { song: JamSongCard; position: number } | null;
  entries: JamEntryCard[];
}

const SONG_CARD_SELECT = {
  id: true,
  title: true,
  imageUrl: true,
  duration: true,
  generationStatus: true,
} as const;

/**
 * Guest-facing session state, keyed by the share token (the token IS the
 * auth). Vetoed entries are hidden — their cards simply disappear; failed
 * ones stay visible as honest feedback. nowPlaying is best-effort from the
 * host's persisted PlaybackState and only reported while the host is
 * actually playing a song that belongs to the session playlist.
 */
export async function getJamSessionState(
  shareToken: string,
): Promise<Result<JamSessionState>> {
  const session = await prisma.jamSession.findUnique({
    where: { shareToken },
    select: {
      id: true,
      status: true,
      budgetTotal: true,
      budgetUsed: true,
      hostUserId: true,
      playlistId: true,
      playlist: { select: { name: true } },
      host: { select: { name: true } },
      entries: {
        where: { status: { not: "vetoed" } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          status: true,
          promptText: true,
          guestName: true,
          createdAt: true,
          song: { select: SONG_CARD_SELECT },
        },
      },
    },
  });
  if (!session) return Err.notFound("Not found");

  let nowPlaying: JamSessionState["nowPlaying"] = null;
  const playback = await prisma.playbackState.findUnique({
    where: { userId: session.hostUserId },
    select: { songId: true, position: true, song: { select: SONG_CARD_SELECT } },
  });
  if (playback?.songId && playback.song) {
    const inPlaylist = await prisma.playlistSong.findFirst({
      where: { playlistId: session.playlistId, songId: playback.songId },
      select: { id: true },
    });
    if (inPlaylist) {
      nowPlaying = { song: playback.song, position: playback.position };
    }
  }

  return success({
    session: {
      id: session.id,
      name: session.playlist.name,
      hostName: session.host.name,
      status: session.status,
      budgetTotal: session.budgetTotal,
      budgetUsed: session.budgetUsed,
    },
    nowPlaying,
    entries: session.entries,
  });
}

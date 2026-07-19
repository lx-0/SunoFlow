import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";
import { type Result, success, Err } from "@/lib/result";
import {
  ensurePublicSlug,
  findOwnedSong,
  invalidatePublicSongCache,
  invalidateSongDashboardCache,
} from "./access";

export async function getSongRating(songId: string, userId: string) {
  const song = await prisma.song.findFirst({
    where: { id: songId, userId },
    select: { rating: true, ratingNote: true },
  });
  if (!song) return Err.notFound();
  return success({ rating: song.rating, ratingNote: song.ratingNote });
}

export async function updateSongRating(
  songId: string,
  userId: string,
  input: { stars: number; note?: string | null },
) {
  const song = await findOwnedSong(userId, songId);
  if (!song) return Err.notFound();

  if (
    typeof input.stars !== "number" ||
    input.stars < 0 ||
    input.stars > 5 ||
    !Number.isInteger(input.stars)
  ) {
    return Err.validation("stars must be an integer 0-5");
  }

  let note: string | null = null;
  if (input.note !== undefined && input.note !== null) {
    if (typeof input.note !== "string") {
      return Err.validation("note must be a string");
    }
    const trimmed = input.note.trim();
    if (trimmed.length > 500) {
      return Err.validation("note must be 500 characters or fewer");
    }
    note = trimmed || null;
  }

  const updated = await prisma.song.update({
    where: { id: song.id },
    data: {
      rating: input.stars === 0 ? null : input.stars,
      ratingNote: input.stars === 0 ? null : note,
    },
  });

  invalidateSongDashboardCache(userId);
  return success({ rating: updated.rating, ratingNote: updated.ratingNote });
}

export async function getSongLyrics(songId: string, userId: string) {
  const song = await prisma.song.findFirst({
    where: { id: songId, userId },
    select: { lyrics: true, lyricsEdited: true },
  });
  if (!song) return Err.notFound();
  return success({
    original: song.lyrics ?? null,
    edited: song.lyricsEdited ?? null,
  });
}

export async function updateSongLyrics(
  songId: string,
  userId: string,
  input: { edited?: string | null },
) {
  const song = await findOwnedSong(userId, songId);
  if (!song) return Err.notFound();

  let edited: string | null = null;
  if (input.edited !== undefined && input.edited !== null) {
    const { value, error } = sanitizeText(input.edited, "lyrics");
    if (error) return Err.validation(error);
    edited = value || null;
  }

  const updated = await prisma.song.update({
    where: { id: song.id },
    data: { lyricsEdited: edited },
    select: { lyrics: true, lyricsEdited: true },
  });

  return success({
    original: updated.lyrics ?? null,
    edited: updated.lyricsEdited ?? null,
  });
}

export async function updateSongVisibility(
  songId: string,
  userId: string,
  visibility: string,
): Promise<Result<{ visibility: string; isPublic: boolean; publicSlug: string | null }>> {
  if (visibility !== "public" && visibility !== "private") {
    return Err.validation("visibility must be 'public' or 'private'");
  }

  const song = await findOwnedSong(userId, songId);
  if (!song) return Err.notFound();

  const isPublic = visibility === "public";
  const data: Record<string, unknown> = { isPublic };
  if (isPublic && !song.publicSlug) {
    data.publicSlug = ensurePublicSlug(song.publicSlug);
  }

  const updated = await prisma.song.update({
    where: { id: song.id },
    data,
  });

  invalidatePublicSongCache(updated.publicSlug);

  return success({
    visibility: updated.isPublic ? "public" : "private",
    isPublic: updated.isPublic,
    publicSlug: updated.publicSlug,
  });
}

export async function updateSongMetadata(
  songId: string,
  userId: string,
  input: { visibility?: "public" | "private"; title?: string },
): Promise<Result<{ visibility: string; isPublic: boolean; publicSlug: string | null; title: string | null }>> {
  if (input.visibility === undefined && input.title === undefined) {
    return Err.validation("At least one field must be provided");
  }

  const song = await findOwnedSong(userId, songId);
  if (!song) return Err.notFound();

  const data: Record<string, unknown> = {};

  if (input.visibility !== undefined) {
    if (input.visibility !== "public" && input.visibility !== "private") {
      return Err.validation("visibility must be 'public' or 'private'");
    }

    const isPublic = input.visibility === "public";
    data.isPublic = isPublic;
    if (isPublic && !song.publicSlug) {
      data.publicSlug = ensurePublicSlug(song.publicSlug);
    }
  }

  if (input.title !== undefined) {
    const { value, error } = sanitizeText(input.title, "title");
    if (error) return Err.validation(error);
    data.title = value || null;
  }

  const updated = await prisma.song.update({
    where: { id: song.id },
    data,
  });

  invalidatePublicSongCache(updated.publicSlug);
  invalidateSongDashboardCache(userId);

  return success({
    visibility: updated.isPublic ? "public" : "private",
    isPublic: updated.isPublic,
    publicSlug: updated.publicSlug,
    title: updated.title,
  });
}

export async function toggleSongShare(songId: string, userId: string) {
  const song = await findOwnedSong(userId, songId);
  if (!song) return Err.notFound();

  const newIsPublic = !song.isPublic;
  const publicSlug = newIsPublic
    ? ensurePublicSlug(song.publicSlug)
    : song.publicSlug;

  const updated = await prisma.song.update({
    where: { id: song.id },
    data: { isPublic: newIsPublic, publicSlug },
  });

  invalidatePublicSongCache(updated.publicSlug);

  return success({
    isPublic: updated.isPublic,
    publicSlug: updated.publicSlug,
  });
}

// Archive uses `Song.archivedAt` as the SINGLE source of truth. The "Archive"
// smart playlist is VIRTUAL: it is not materialized as PlaylistSong rows (that
// diverged from the library's batch-archive path, which only sets archivedAt,
// and was wiped by the smart-playlist sweep). Its tile links to the library
// archive view (`/library?smartFilter=archived`); see PlaylistsView + the
// sweep/bootstrap guards in @/lib/smart-playlists.
export async function archiveSong(songId: string, userId: string) {
  const song = await findOwnedSong(userId, songId);
  if (!song) return Err.notFound();

  if (song.archivedAt) {
    return Err.validation("Song is already archived");
  }

  const updated = await prisma.song.update({
    where: { id: songId },
    data: { archivedAt: new Date(), isPublic: false },
  });

  return success({ song: updated });
}

export async function restoreSong(songId: string, userId: string) {
  const song = await findOwnedSong(userId, songId, { archivedAt: { not: null } });
  if (!song) return Err.notFound();

  const updated = await prisma.song.update({
    where: { id: songId },
    data: { archivedAt: null },
  });

  return success({ song: updated });
}

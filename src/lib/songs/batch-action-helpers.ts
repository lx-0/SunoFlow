import type { Song } from "@prisma/client";
import type { LibraryBatchAction } from "./library-client";

type SimpleAction = Exclude<LibraryBatchAction, "tag" | "add_to_playlist">;

/**
 * Applies the optimistic state update for a batch action to the songs list.
 */
export function applyBatchActionToSongs(
  songs: Song[],
  selectedIds: Set<string>,
  action: SimpleAction
): Song[] {
  switch (action) {
    case "favorite":
      return songs.map((s) => (selectedIds.has(s.id) ? { ...s, isFavorite: true } : s));
    case "unfavorite":
      return songs.map((s) => (selectedIds.has(s.id) ? { ...s, isFavorite: false } : s));
    case "make_public":
      return songs.map((s) => (selectedIds.has(s.id) ? { ...s, isPublic: true } : s));
    case "make_private":
      return songs.map((s) => (selectedIds.has(s.id) ? { ...s, isPublic: false } : s));
    case "delete":
    case "restore":
    case "permanent_delete":
      return songs.filter((s) => !selectedIds.has(s.id));
  }
}

/**
 * Returns the success toast message for a completed batch action.
 */
export function batchActionMessage(action: SimpleAction, count: number): string {
  const s = count !== 1 ? "s" : "";
  switch (action) {
    case "favorite":        return `${count} song${s} added to favorites`;
    case "unfavorite":      return `${count} song${s} removed from favorites`;
    case "delete":          return `${count} song${s} moved to archive`;
    case "restore":         return `${count} song${s} restored`;
    case "permanent_delete":return `${count} song${s} permanently deleted`;
    case "make_public":     return `${count} song${s} made public`;
    case "make_private":    return `${count} song${s} made private`;
  }
}

"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ListMusic, Plus, ChevronDown } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "./Toast";
import { track } from "@/lib/analytics";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import {
  addSongToPlaylist,
  fetchPlaylistOptions,
  type LibraryPlaylistOption,
} from "@/lib/songs/library-client";

interface AddToPlaylistButtonProps {
  songId: string;
  songTitle?: string;
  /** "icon" = compact round icon button (LibraryView style).
   *  "button" = full pill button with text (SongDetailView style). */
  variant?: "icon" | "button";
}

export function AddToPlaylistButton({
  songId,
  variant = "icon",
}: AddToPlaylistButtonProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<LibraryPlaylistOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useOutsideClick(menuRef, () => setOpen(false), open);

  async function handleOpen() {
    setOpen((prev) => !prev);
    if (!open) {
      setLoading(true);
      try {
        setPlaylists(await fetchPlaylistOptions());
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleAdd(playlistId: string) {
    setAdding(playlistId);
    try {
      const result = await addSongToPlaylist(playlistId, songId);
      if (!result.ok) {
        toast(result.error, "error");
      } else {
        track("playlist_song_added", { playlistId });
        toast("Added to playlist", "success");
        setOpen(false);
      }
    } catch {
      toast("Failed to add to playlist", "error");
    } finally {
      setAdding(null);
    }
  }

  // Hide entirely when not logged in
  if (!session) return null;

  return (
    <div className="relative" ref={menuRef}>
      {variant === "icon" ? (
        <button
          onClick={handleOpen}
          aria-label="Add to playlist"
          className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-muted hover:text-violet-400 transition-colors"
        >
          <Icon icon={ListMusic} className="w-5 h-5" aria-hidden="true" />
        </button>
      ) : (
        <button
          onClick={handleOpen}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-surface-raised hover:bg-surface-hover text-primary transition-all duration-200 active:scale-95 min-h-[44px]"
        >
          <Icon icon={Plus} className="w-4 h-4 flex-shrink-0" fill="currentColor" aria-hidden="true" />
          Add to playlist
          <Icon icon={ChevronDown} className="w-3 h-3" fill="currentColor" aria-hidden="true" />
        </button>
      )}

      {open && (
        <div
          className={
            variant === "icon"
              ? "absolute right-0 bottom-full mb-1 w-48 bg-surface border border-border rounded-xl shadow-lg z-20 overflow-hidden"
              : "absolute top-full left-0 mt-1 w-56 max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-xl shadow-xl z-20 py-1 max-h-60 overflow-y-auto"
          }
        >
          {loading ? (
            <p className="px-4 py-3 text-sm text-secondary">Loading…</p>
          ) : playlists.length === 0 ? (
            <p className="px-4 py-3 text-sm text-secondary">No playlists yet</p>
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => handleAdd(pl.id)}
                disabled={adding === pl.id}
                className={
                  variant === "icon"
                    ? "w-full text-left px-4 py-3 text-sm text-primary hover:bg-surface-hover transition-colors border-b last:border-b-0 border-border disabled:opacity-50"
                    : "w-full text-left px-3 py-2 text-sm text-primary hover:bg-surface-hover transition-colors disabled:opacity-50 flex items-center justify-between"
                }
              >
                <span className="truncate">{pl.name}</span>
                <span className="text-xs text-secondary flex-shrink-0 ml-2">
                  {variant === "icon"
                    ? `(${pl._count.songs})`
                    : `${pl._count.songs} songs`}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import type { Song } from "@prisma/client";
import { downloadSongFile } from "@/lib/download";
import { songToQueueSong } from "@/lib/song-mappers";
import type { QueueSong } from "../QueueContext";

function toDownloadable(song: Song) {
  return {
    id: song.id,
    title: song.title ?? "Untitled",
    audioUrl: song.audioUrl ?? "",
    tags: song.tags ?? undefined,
  };
}

interface UseLibrarySongActionsParams {
  songs: Song[];
  currentSongId: string | null;
  togglePlay: (song: QueueSong) => void;
  playQueue: (queue: QueueSong[], index: number) => void;
  seek: (pct: number) => void;
  toast: (msg: string, type: "success" | "error" | "info") => void;
  router: { refresh: () => void };
  onSongUpdate: (updated: Song) => void;
}

export function useLibrarySongActions({
  songs,
  currentSongId,
  togglePlay,
  playQueue,
  seek,
  toast,
  router,
  onSongUpdate,
}: UseLibrarySongActionsParams) {
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({});
  const [retryingId, setRetryingId] = useState<string | null>(null);

  async function handleTogglePlay(song: Song) {
    if (currentSongId === song.id) {
      const qs = songToQueueSong(song);
      if (qs) togglePlay(qs);
      return;
    }

    const REFRESH_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;
    const rawExpiresAt = (song as Song & { audioUrlExpiresAt?: Date | string | null }).audioUrlExpiresAt;
    const expiresAtMs = rawExpiresAt ? new Date(rawExpiresAt).getTime() : null;
    const isNearExpiry =
      song.audioUrl &&
      (!expiresAtMs || isNaN(expiresAtMs) || expiresAtMs - Date.now() < REFRESH_THRESHOLD_MS);

    let playSong = song;
    if (isNearExpiry) {
      try {
        const res = await fetch(`/api/songs/${song.id}/refresh`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.song?.audioUrl) {
            playSong = { ...song, audioUrl: data.song.audioUrl };
            onSongUpdate(playSong);
          }
        } else if (res.status === 404) {
          const data = await res.json().catch(() => ({}));
          if (data.code === "SONG_DELETED") {
            toast("This song no longer exists on Suno and cannot be played.", "error");
            return;
          }
        }
      } catch {
        // Transient error — try playing with whatever URL we have
      }
    }

    const qs = songToQueueSong(playSong);
    if (!qs) return;

    const allQueueSongs = songs
      .map(songToQueueSong)
      .filter((s): s is QueueSong => s !== null);
    const idx = allQueueSongs.findIndex((s) => s.id === song.id);
    playQueue(allQueueSongs, idx >= 0 ? idx : 0);
  }

  async function handleDownload(song: Song) {
    if (!song.audioUrl || song.id in downloadProgress) return;
    setDownloadErrors((e) => { const n = { ...e }; delete n[song.id]; return n; });
    setDownloadProgress((p) => ({ ...p, [song.id]: 0 }));
    try {
      await downloadSongFile(toDownloadable(song), (pct) =>
        setDownloadProgress((p) => ({ ...p, [song.id]: pct }))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Download failed";
      setDownloadErrors((e) => ({ ...e, [song.id]: msg }));
      toast(msg, "error");
    } finally {
      setTimeout(
        () => setDownloadProgress((p) => { const n = { ...p }; delete n[song.id]; return n; }),
        1500
      );
    }
  }

  function handleSeek(pct: number) {
    seek(pct);
  }

  async function handleToggleFavorite(song: Song) {
    const newFav = !song.isFavorite;
    const prevCount = (song as Song & { favoriteCount?: number }).favoriteCount ?? 0;
    const optimistic = { ...song, isFavorite: newFav, favoriteCount: newFav ? prevCount + 1 : Math.max(0, prevCount - 1) };
    onSongUpdate(optimistic as Song);

    try {
      const res = await fetch(`/api/songs/${song.id}/favorite`, {
        method: newFav ? "POST" : "DELETE",
      });
      if (!res.ok) {
        onSongUpdate(song);
        toast("Failed to update favorite", "error");
      } else {
        const data = await res.json();
        onSongUpdate({ ...song, isFavorite: newFav, favoriteCount: data.favoriteCount } as Song);
        toast(newFav ? "Added to favorites" : "Removed from favorites", "success");
      }
    } catch {
      onSongUpdate(song);
      toast("Failed to update favorite", "error");
    }
  }

  async function handleRetry(song: Song) {
    if (retryingId) return;
    setRetryingId(song.id);

    try {
      const res = await fetch(`/api/songs/${song.id}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 && data.resetAt) {
          const resetTime = new Date(data.resetAt);
          const minutesLeft = Math.ceil((resetTime.getTime() - Date.now()) / 60000);
          toast(`Rate limit reached. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`, "error");
        } else {
          toast(data.error ?? "Retry failed. Please try again.", "error");
        }
        return;
      }

      if (data.song) {
        onSongUpdate(data.song);
      }
      toast("Retry started! Song is regenerating.", "success");
      router.refresh();
    } catch {
      toast("Network error. Please check your connection.", "error");
    } finally {
      setRetryingId(null);
    }
  }

  const handlePlayAll = useCallback(() => {
    const allQueueSongs = songs
      .map(songToQueueSong)
      .filter((s): s is QueueSong => s !== null);
    if (allQueueSongs.length > 0) {
      playQueue(allQueueSongs, 0);
    }
  }, [songs, playQueue]);

  return {
    downloadProgress,
    downloadErrors,
    retryingId,
    handleTogglePlay,
    handleDownload,
    handleSeek,
    handleToggleFavorite,
    handleRetry,
    handlePlayAll,
  };
}

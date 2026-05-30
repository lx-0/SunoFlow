"use client";

import { useCallback, useState } from "react";
import type { Song } from "@prisma/client";
import { useRouter } from "next/navigation";
import { downloadSongFile } from "@/lib/download";
import { songToQueueSong } from "@/lib/song-mappers";
import { useToast } from "@/components/Toast";
import { useQueue, type QueueSong } from "@/components/QueueContext";
import { CDN_REFRESH_THRESHOLD_MS } from "@/lib/cdn-constants";
import { refreshSongAudio, toggleSongFavorite, retrySong } from "@/lib/song-api";

function toDownloadable(song: Song) {
  return {
    id: song.id,
    title: song.title ?? "Untitled",
    audioUrl: song.audioUrl ?? "",
    tags: song.tags ?? undefined,
  };
}

export function useLibrarySongActions(
  songs: Song[],
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>
) {
  const { toast } = useToast();
  const router = useRouter();
  const {
    queue,
    currentIndex,
    isPlaying,
    currentTime,
    duration: audioDuration,
    togglePlay,
    playQueue,
    seek,
  } = useQueue();

  const currentSongId = currentIndex >= 0 ? queue[currentIndex]?.id ?? null : null;

  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({});
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleSongUpdate = useCallback((updated: Song) => {
    setSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, [setSongs]);

  async function handleTogglePlay(song: Song) {
    if (currentSongId === song.id) {
      const qs = songToQueueSong(song);
      if (qs) togglePlay(qs);
      return;
    }

    const rawExpiresAt = (song as Song & { audioUrlExpiresAt?: Date | string | null }).audioUrlExpiresAt;
    const expiresAtMs = rawExpiresAt ? new Date(rawExpiresAt).getTime() : null;
    const isNearExpiry =
      song.audioUrl &&
      (!expiresAtMs || isNaN(expiresAtMs) || expiresAtMs - Date.now() < CDN_REFRESH_THRESHOLD_MS);

    let playSong = song;
    if (isNearExpiry) {
      try {
        const result = await refreshSongAudio(song.id);
        if ("deleted" in result) {
          toast("This song no longer exists on Suno and cannot be played.", "error");
          return;
        }
        if (result.audioUrl) {
          playSong = { ...song, audioUrl: result.audioUrl };
          handleSongUpdate(playSong);
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
    handleSongUpdate(optimistic as Song);

    try {
      const data = await toggleSongFavorite(song.id, newFav);
      handleSongUpdate({ ...song, isFavorite: newFav, favoriteCount: data.favoriteCount } as Song);
      toast(newFav ? "Added to favorites" : "Removed from favorites", "success");
    } catch {
      handleSongUpdate(song);
      toast("Failed to update favorite", "error");
    }
  }

  async function handleRetry(song: Song) {
    if (retryingId) return;
    setRetryingId(song.id);

    try {
      const result = await retrySong(song.id);
      if ("rateLimitMinutes" in result) {
        const m = result.rateLimitMinutes;
        toast(`Rate limit reached. Try again in ${m} minute${m === 1 ? "" : "s"}.`, "error");
        return;
      }
      if ("error" in result) {
        toast(result.error, "error");
        return;
      }
      if (result.song) {
        handleSongUpdate(result.song as Song);
      }
      toast("Retry started! Song is regenerating.", "success");
      router.refresh();
    } catch {
      toast("Network error. Please check your connection.", "error");
    } finally {
      setRetryingId(null);
    }
  }

  function handlePlayAll() {
    const allQueueSongs = songs
      .map(songToQueueSong)
      .filter((s): s is QueueSong => s !== null);
    if (allQueueSongs.length > 0) {
      playQueue(allQueueSongs, 0);
    }
  }

  return {
    currentSongId,
    isPlaying,
    currentTime,
    audioDuration,
    downloadProgress,
    downloadErrors,
    retryingId,
    handleSongUpdate,
    handleTogglePlay,
    handleDownload,
    handleSeek,
    handleToggleFavorite,
    handleRetry,
    handlePlayAll,
  };
}

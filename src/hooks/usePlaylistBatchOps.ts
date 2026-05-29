"use client";

import { useState, useCallback } from "react";
import type { Song } from "@prisma/client";
import { exportAsZip } from "@/lib/export";

export interface PlaylistSongItem {
  id: string;
  songId: string;
  position: number;
  song: Song;
  addedByUser: {
    id: string;
    name: string | null;
    image: string | null;
    avatarUrl: string | null;
    username?: string | null;
  } | null;
}

interface UsePlaylistBatchOpsOptions {
  playlistId: string;
  songs: PlaylistSongItem[];
  setSongs: React.Dispatch<React.SetStateAction<PlaylistSongItem[]>>;
  toast: (message: string, type: "success" | "error") => void;
}

export function usePlaylistBatchOps({
  playlistId,
  songs,
  setSongs,
  toast,
}: UsePlaylistBatchOpsOptions) {
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedSongIds.size > 0;
  const [batchLoading, setBatchLoading] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [batchDownloadProgress, setBatchDownloadProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  const handleToggleSelect = useCallback((songId: string) => {
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedSongIds.size === songs.length) {
      setSelectedSongIds(new Set());
    } else {
      setSelectedSongIds(new Set(songs.map((ps) => ps.songId)));
    }
  }, [selectedSongIds.size, songs]);

  const handleBatchRemoveFromPlaylist = useCallback(async () => {
    if (batchLoading || selectedSongIds.size === 0) return;
    setBatchLoading(true);
    const idsToRemove = Array.from(selectedSongIds);
    // Optimistic update
    setSongs((prev) => prev.filter((ps) => !selectedSongIds.has(ps.songId)));
    setSelectedSongIds(new Set());
    setShowBatchDeleteConfirm(false);
    try {
      await Promise.all(
        idsToRemove.map((songId) =>
          fetch(`/api/playlists/${playlistId}/songs/${songId}`, { method: "DELETE" })
        )
      );
      toast(
        `Removed ${idsToRemove.length} song${idsToRemove.length !== 1 ? "s" : ""} from playlist`,
        "success"
      );
    } catch {
      toast("Failed to remove some songs", "error");
    } finally {
      setBatchLoading(false);
    }
  }, [batchLoading, selectedSongIds, setSongs, playlistId, toast]);

  const handleBatchDownload = useCallback(async () => {
    if (batchDownloading || selectedSongIds.size === 0) return;
    const selectedSongs = songs
      .filter((ps) => selectedSongIds.has(ps.songId) && ps.song.audioUrl)
      .map((ps) => ({ ...ps.song, audioUrl: ps.song.audioUrl! }));
    if (selectedSongs.length === 0) {
      toast("No downloadable songs selected", "error");
      return;
    }
    setBatchDownloading(true);
    setBatchDownloadProgress({ completed: 0, total: selectedSongs.length });
    try {
      await exportAsZip(selectedSongs, (completed, total) => {
        setBatchDownloadProgress({ completed, total });
      });
      toast(
        `Downloaded ${selectedSongs.length} song${selectedSongs.length !== 1 ? "s" : ""} as ZIP`,
        "success"
      );
    } catch {
      toast("Download failed", "error");
    } finally {
      setBatchDownloading(false);
      setBatchDownloadProgress(null);
    }
  }, [batchDownloading, selectedSongIds, songs, toast]);

  return {
    selectedSongIds,
    setSelectedSongIds,
    selectionMode,
    batchLoading,
    showBatchDeleteConfirm,
    setShowBatchDeleteConfirm,
    batchDownloading,
    batchDownloadProgress,
    handleToggleSelect,
    handleSelectAll,
    handleBatchRemoveFromPlaylist,
    handleBatchDownload,
  };
}

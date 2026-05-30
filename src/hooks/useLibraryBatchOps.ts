"use client";

import { useState } from "react";
import type { Song } from "@prisma/client";
import { exportAsZip, type AudioFormat } from "@/lib/export";
import { useMenuState } from "@/hooks/useMenuState";
import { runSongsBatchAction, fetchPlaylistOptions } from "@/lib/songs/library-client";

interface PlaylistOption {
  id: string;
  name: string;
  _count: { songs: number };
}

interface UseLibraryBatchOpsOptions {
  songs: Song[];
  selectedSongIds: Set<string>;
  clearSelection: () => void;
  toast: (message: string, variant?: "success" | "error" | "info") => void;
  onRefresh: () => void;
}

export function useLibraryBatchOps({
  songs,
  selectedSongIds,
  clearSelection,
  toast,
  onRefresh,
}: UseLibraryBatchOpsOptions) {
  const tagMenu = useMenuState();
  const playlistMenu = useMenuState();
  const downloadFormatMenu = useMenuState();
  const [batchPlaylists, setBatchPlaylists] = useState<PlaylistOption[]>([]);
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [batchDownloadProgress, setBatchDownloadProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [batchDownloadFormat, setBatchDownloadFormat] = useState<AudioFormat>("mp3");

  async function handleBatchTag(tagId: string) {
    tagMenu.setShow(false);
    if (selectedSongIds.size === 0) return;
    tagMenu.setLoading(true);
    try {
      const result = await runSongsBatchAction({
        action: "tag",
        songIds: Array.from(selectedSongIds),
        tagId,
      });
      if (!result.ok) {
        toast(result.error || "Batch tag failed", "error");
        return;
      }
      toast(`Tagged ${result.affected} song${result.affected !== 1 ? "s" : ""}`, "success");
      clearSelection();
      onRefresh();
    } catch {
      toast("Batch tag failed", "error");
    } finally {
      tagMenu.setLoading(false);
    }
  }

  async function handleBatchAddToPlaylist(playlistId: string) {
    playlistMenu.setShow(false);
    if (selectedSongIds.size === 0) return;
    playlistMenu.setLoading(true);
    try {
      const result = await runSongsBatchAction({
        action: "add_to_playlist",
        songIds: Array.from(selectedSongIds),
        playlistId,
      });
      if (!result.ok) {
        toast(result.error || "Batch add to playlist failed", "error");
        return;
      }
      toast(`Added ${result.affected} song${result.affected !== 1 ? "s" : ""} to playlist`, "success");
      clearSelection();
    } catch {
      toast("Batch add to playlist failed", "error");
    } finally {
      playlistMenu.setLoading(false);
    }
  }

  async function openBatchPlaylistMenu() {
    playlistMenu.setShow(true);
    const playlists = await fetchPlaylistOptions();
    if (playlists.length > 0) {
      setBatchPlaylists(playlists);
    }
  }

  async function handleBatchDownload(fmt: AudioFormat = batchDownloadFormat) {
    downloadFormatMenu.setShow(false);
    if (selectedSongIds.size === 0) return;
    const selectedSongs = songs
      .filter((s) => selectedSongIds.has(s.id) && s.audioUrl && s.generationStatus === "ready")
      .map((s) => ({
        id: s.id,
        title: s.title,
        audioUrl: s.audioUrl!,
        tags: s.tags,
        duration: s.duration,
        createdAt: s.createdAt,
      }));
    if (selectedSongs.length === 0) {
      toast("No downloadable songs selected", "info");
      return;
    }
    setBatchDownloading(true);
    setBatchDownloadProgress({ completed: 0, total: selectedSongs.length });
    try {
      await exportAsZip(
        selectedSongs,
        (completed, total) => setBatchDownloadProgress({ completed, total }),
        { format: fmt }
      );
      toast(`Downloaded ${selectedSongs.length} song${selectedSongs.length !== 1 ? "s" : ""} as ${fmt.toUpperCase()} ZIP`, "success");
      clearSelection();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Download failed", "error");
    } finally {
      setBatchDownloading(false);
      setBatchDownloadProgress(null);
    }
  }

  return {
    showBatchTagMenu: tagMenu.show,
    setShowBatchTagMenu: tagMenu.setShow,
    showBatchPlaylistMenu: playlistMenu.show,
    setShowBatchPlaylistMenu: playlistMenu.setShow,
    batchTagLoading: tagMenu.loading,
    batchPlaylistLoading: playlistMenu.loading,
    batchPlaylists,
    batchDownloading,
    batchDownloadProgress,
    showBatchDownloadFormatMenu: downloadFormatMenu.show,
    setShowBatchDownloadFormatMenu: downloadFormatMenu.setShow,
    batchDownloadFormat,
    setBatchDownloadFormat,
    batchTagMenuRef: tagMenu.ref,
    batchPlaylistMenuRef: playlistMenu.ref,
    batchDownloadFormatMenuRef: downloadFormatMenu.ref,
    handleBatchTag,
    handleBatchAddToPlaylist,
    openBatchPlaylistMenu,
    handleBatchDownload,
  };
}

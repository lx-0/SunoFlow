"use client";

import { useRef, useState } from "react";
import type { Song } from "@prisma/client";
import { exportAsZip, type AudioFormat } from "@/lib/export";
import { useOutsideClick } from "@/hooks/useOutsideClick";
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
  const [showBatchTagMenu, setShowBatchTagMenu] = useState(false);
  const [showBatchPlaylistMenu, setShowBatchPlaylistMenu] = useState(false);
  const [batchTagLoading, setBatchTagLoading] = useState(false);
  const [batchPlaylistLoading, setBatchPlaylistLoading] = useState(false);
  const [batchPlaylists, setBatchPlaylists] = useState<PlaylistOption[]>([]);
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [batchDownloadProgress, setBatchDownloadProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [showBatchDownloadFormatMenu, setShowBatchDownloadFormatMenu] = useState(false);
  const [batchDownloadFormat, setBatchDownloadFormat] = useState<AudioFormat>("mp3");

  const batchTagMenuRef = useRef<HTMLDivElement>(null);
  const batchPlaylistMenuRef = useRef<HTMLDivElement>(null);
  const batchDownloadFormatMenuRef = useRef<HTMLDivElement>(null);

  useOutsideClick(batchTagMenuRef, () => setShowBatchTagMenu(false), showBatchTagMenu);
  useOutsideClick(batchPlaylistMenuRef, () => setShowBatchPlaylistMenu(false), showBatchPlaylistMenu);
  useOutsideClick(batchDownloadFormatMenuRef, () => setShowBatchDownloadFormatMenu(false), showBatchDownloadFormatMenu);

  async function handleBatchTag(tagId: string) {
    setShowBatchTagMenu(false);
    if (selectedSongIds.size === 0) return;
    setBatchTagLoading(true);
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
      setBatchTagLoading(false);
    }
  }

  async function handleBatchAddToPlaylist(playlistId: string) {
    setShowBatchPlaylistMenu(false);
    if (selectedSongIds.size === 0) return;
    setBatchPlaylistLoading(true);
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
      setBatchPlaylistLoading(false);
    }
  }

  async function openBatchPlaylistMenu() {
    setShowBatchPlaylistMenu(true);
    const playlists = await fetchPlaylistOptions();
    if (playlists.length > 0) {
      setBatchPlaylists(playlists);
    }
  }

  async function handleBatchDownload(fmt: AudioFormat = batchDownloadFormat) {
    setShowBatchDownloadFormatMenu(false);
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
    showBatchTagMenu,
    setShowBatchTagMenu,
    showBatchPlaylistMenu,
    setShowBatchPlaylistMenu,
    batchTagLoading,
    batchPlaylistLoading,
    batchPlaylists,
    batchDownloading,
    batchDownloadProgress,
    showBatchDownloadFormatMenu,
    setShowBatchDownloadFormatMenu,
    batchDownloadFormat,
    setBatchDownloadFormat,
    batchTagMenuRef,
    batchPlaylistMenuRef,
    batchDownloadFormatMenuRef,
    handleBatchTag,
    handleBatchAddToPlaylist,
    openBatchPlaylistMenu,
    handleBatchDownload,
  };
}

"use client";

import { useRef, useState } from "react";
import type { Song } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import {
  fetchPlaylistOptions,
  runSongsBatchAction,
  type LibraryBatchAction,
} from "@/lib/songs/library-client";
import { exportAsZip, type AudioFormat } from "@/lib/export";

export interface PlaylistOption {
  id: string;
  name: string;
  _count: { songs: number };
}

type BatchActionType = Exclude<LibraryBatchAction, "tag" | "add_to_playlist">;

interface UseLibraryBatchActionsOptions {
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  selectedSongIds: Set<string>;
  clearSelection: () => void;
  isArchiveView: boolean;
}

export function useLibraryBatchActions(options: UseLibraryBatchActionsOptions) {
  const { songs, setSongs, selectedSongIds, clearSelection } = options;
  const { toast } = useToast();
  const router = useRouter();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const [showBatchTagMenu, setShowBatchTagMenu] = useState(false);
  const [batchTagLoading, setBatchTagLoading] = useState(false);
  const batchTagMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(batchTagMenuRef, () => setShowBatchTagMenu(false), showBatchTagMenu);

  const [showBatchPlaylistMenu, setShowBatchPlaylistMenu] = useState(false);
  const [batchPlaylistLoading, setBatchPlaylistLoading] = useState(false);
  const [batchPlaylists, setBatchPlaylists] = useState<PlaylistOption[]>([]);
  const batchPlaylistMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(batchPlaylistMenuRef, () => setShowBatchPlaylistMenu(false), showBatchPlaylistMenu);

  const [batchDownloading, setBatchDownloading] = useState(false);
  const [batchDownloadProgress, setBatchDownloadProgress] = useState<{ completed: number; total: number } | null>(null);
  const [showBatchDownloadFormatMenu, setShowBatchDownloadFormatMenu] = useState(false);
  const [batchDownloadFormat, setBatchDownloadFormat] = useState<AudioFormat>("mp3");
  const batchDownloadFormatMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(
    batchDownloadFormatMenuRef,
    () => setShowBatchDownloadFormatMenu(false),
    showBatchDownloadFormatMenu
  );

  const [pendingMenuDelete, setPendingMenuDelete] = useState<{ song: Song } | null>(null);
  const [menuDeleteLoading, setMenuDeleteLoading] = useState(false);

  async function handleBatchAction(action: BatchActionType) {
    if (selectedSongIds.size === 0) return;
    if (action === "delete" || action === "permanent_delete") {
      setShowDeleteConfirm(true);
      return;
    }
    await executeBatchAction(action);
  }

  async function executeBatchAction(action: BatchActionType) {
    const songIds = Array.from(selectedSongIds);
    setBatchLoading(true);

    try {
      const result = await runSongsBatchAction({ action, songIds });
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      const count = result.affected;

      if (action === "favorite") {
        setSongs((prev) =>
          prev.map((s) => (selectedSongIds.has(s.id) ? { ...s, isFavorite: true } : s))
        );
        toast(`${count} song${count !== 1 ? "s" : ""} added to favorites`, "success");
      } else if (action === "unfavorite") {
        setSongs((prev) =>
          prev.map((s) => (selectedSongIds.has(s.id) ? { ...s, isFavorite: false } : s))
        );
        toast(`${count} song${count !== 1 ? "s" : ""} removed from favorites`, "success");
      } else if (action === "delete") {
        setSongs((prev) => prev.filter((s) => !selectedSongIds.has(s.id)));
        toast(`${count} song${count !== 1 ? "s" : ""} moved to archive`, "success");
      } else if (action === "restore") {
        setSongs((prev) => prev.filter((s) => !selectedSongIds.has(s.id)));
        toast(`${count} song${count !== 1 ? "s" : ""} restored`, "success");
      } else if (action === "permanent_delete") {
        setSongs((prev) => prev.filter((s) => !selectedSongIds.has(s.id)));
        toast(`${count} song${count !== 1 ? "s" : ""} permanently deleted`, "success");
      } else if (action === "make_public") {
        setSongs((prev) =>
          prev.map((s) => (selectedSongIds.has(s.id) ? { ...s, isPublic: true } : s))
        );
        toast(`${count} song${count !== 1 ? "s" : ""} made public`, "success");
      } else if (action === "make_private") {
        setSongs((prev) =>
          prev.map((s) => (selectedSongIds.has(s.id) ? { ...s, isPublic: false } : s))
        );
        toast(`${count} song${count !== 1 ? "s" : ""} made private`, "success");
      }

      clearSelection();
    } catch {
      toast("Batch operation failed", "error");
    } finally {
      setBatchLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleSingleSongAction(song: Song, action: "delete" | "restore" | "permanent_delete") {
    if (action === "permanent_delete") {
      setPendingMenuDelete({ song });
      return;
    }

    try {
      const result = await runSongsBatchAction({ action, songIds: [song.id] });
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      if (action === "delete") {
        setSongs((prev) => prev.filter((s) => s.id !== song.id));
        toast(`"${song.title ?? "Song"}" moved to archive`, "success");
      } else if (action === "restore") {
        setSongs((prev) => prev.filter((s) => s.id !== song.id));
        toast(`"${song.title ?? "Song"}" restored`, "success");
      }
    } catch {
      toast("Action failed", "error");
    }
  }

  async function executePendingMenuDelete() {
    if (!pendingMenuDelete) return;
    const { song } = pendingMenuDelete;
    setMenuDeleteLoading(true);
    try {
      const result = await runSongsBatchAction({
        action: "permanent_delete",
        songIds: [song.id],
      });
      if (!result.ok) {
        toast(result.error || "Delete failed", "error");
        return;
      }
      setSongs((prev) => prev.filter((s) => s.id !== song.id));
      toast(`"${song.title ?? "Song"}" permanently deleted`, "success");
      setPendingMenuDelete(null);
    } catch {
      toast("Delete failed", "error");
    } finally {
      setMenuDeleteLoading(false);
    }
  }

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
      router.refresh();
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
    showDeleteConfirm,
    setShowDeleteConfirm,
    batchLoading,
    showBatchTagMenu,
    setShowBatchTagMenu,
    batchTagLoading,
    batchTagMenuRef,
    showBatchPlaylistMenu,
    batchPlaylistLoading,
    batchPlaylists,
    batchPlaylistMenuRef,
    batchDownloading,
    batchDownloadProgress,
    showBatchDownloadFormatMenu,
    setShowBatchDownloadFormatMenu,
    batchDownloadFormat,
    setBatchDownloadFormat,
    batchDownloadFormatMenuRef,
    pendingMenuDelete,
    setPendingMenuDelete,
    menuDeleteLoading,
    handleBatchAction,
    executeBatchAction,
    handleSingleSongAction,
    executePendingMenuDelete,
    handleBatchTag,
    handleBatchAddToPlaylist,
    openBatchPlaylistMenu,
    handleBatchDownload,
  };
}

export type UseLibraryBatchActionsReturn = ReturnType<typeof useLibraryBatchActions>;

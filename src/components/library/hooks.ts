"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Song } from "@prisma/client";
import { downloadSongFile } from "@/lib/download";
import { exportAsZip, exportAsM3U, type ExportableSong, type AudioFormat } from "@/lib/export";
import { songToQueueSong } from "@/lib/song-mappers";
import type { QueueSong } from "@/components/QueueContext";
import {
  fetchPlaylistOptions,
  runSongsBatchAction,
  type LibraryBatchAction,
} from "@/lib/songs/library-client";
import { applyBatchActionToSongs, batchActionMessage } from "@/lib/songs/batch-action-helpers";
import { useMenuState } from "@/hooks/useMenuState";
import { toggleSelectAll, toggleSelection } from "./selection";
import { CDN_REFRESH_THRESHOLD_MS } from "@/lib/cdn-constants";

type ToastFn = (message: string, variant?: "success" | "error" | "info") => void;

function toDownloadable(song: Song) {
  return {
    id: song.id,
    title: song.title ?? "Untitled",
    audioUrl: song.audioUrl ?? "",
    tags: song.tags ?? undefined,
  };
}

// ─── useLibrarySongActions ──────────────────────────────────────────────────

interface UseLibrarySongActionsOptions {
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  currentSongId: string | null;
  togglePlay: (song: QueueSong) => void;
  playQueue: (queue: QueueSong[], index: number) => void;
  toast: ToastFn;
  refreshRouter: () => void;
}

export function useLibrarySongActions({
  songs,
  setSongs,
  currentSongId,
  togglePlay,
  playQueue,
  toast,
  refreshRouter,
}: UseLibrarySongActionsOptions) {
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({});
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleSongUpdate = useCallback((updated: Song) => {
    setSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, [setSongs]);

  const handleTogglePlay = useCallback(async (song: Song) => {
    if (currentSongId === song.id) {
      const qs = songToQueueSong(song);
      if (qs) togglePlay(qs as QueueSong);
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
        const res = await fetch(`/api/songs/${song.id}/refresh`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.song?.audioUrl) {
            playSong = { ...song, audioUrl: data.song.audioUrl };
            handleSongUpdate(playSong);
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
  }, [songs, currentSongId, togglePlay, playQueue, toast, handleSongUpdate]);

  const handleDownload = useCallback(async (song: Song) => {
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
  }, [downloadProgress, toast]);

  const handleToggleFavorite = useCallback(async (song: Song) => {
    const newFav = !song.isFavorite;
    const prevCount = (song as Song & { favoriteCount?: number }).favoriteCount ?? 0;
    const optimistic = { ...song, isFavorite: newFav, favoriteCount: newFav ? prevCount + 1 : Math.max(0, prevCount - 1) };
    handleSongUpdate(optimistic as Song);

    try {
      const res = await fetch(`/api/songs/${song.id}/favorite`, {
        method: newFav ? "POST" : "DELETE",
      });
      if (!res.ok) {
        handleSongUpdate(song);
        toast("Failed to update favorite", "error");
      } else {
        const data = await res.json();
        handleSongUpdate({ ...song, isFavorite: newFav, favoriteCount: data.favoriteCount } as Song);
        toast(newFav ? "Added to favorites" : "Removed from favorites", "success");
      }
    } catch {
      handleSongUpdate(song);
      toast("Failed to update favorite", "error");
    }
  }, [handleSongUpdate, toast]);

  const handleRetry = useCallback(async (song: Song) => {
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
        handleSongUpdate(data.song);
      }
      toast("Retry started! Song is regenerating.", "success");
      refreshRouter();
    } catch {
      toast("Network error. Please check your connection.", "error");
    } finally {
      setRetryingId(null);
    }
  }, [retryingId, handleSongUpdate, toast, refreshRouter]);

  const handleSingleSongAction = useCallback(async (
    song: Song,
    action: "delete" | "restore" | "permanent_delete",
    onPermanentDelete: (song: Song) => void,
  ) => {
    if (action === "permanent_delete") {
      onPermanentDelete(song);
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
  }, [setSongs, toast]);

  return {
    downloadProgress,
    downloadErrors,
    retryingId,
    handleSongUpdate,
    handleTogglePlay,
    handleDownload,
    handleToggleFavorite,
    handleRetry,
    handleSingleSongAction,
  };
}

// ─── useLibrarySelection ────────────────────────────────────────────────────

export function useLibrarySelection(songIds: string[]) {
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const selectionMode = selectedSongIds.size > 0;

  const handleToggleSelect = useCallback((songId: string, shiftKey: boolean) => {
    const next = toggleSelection({
      songId,
      songIds,
      shiftKey,
      state: { selectedIds: selectedSongIds, lastSelectedIndex },
    });
    setSelectedSongIds(next.selectedIds);
    setLastSelectedIndex(next.lastSelectedIndex);
  }, [songIds, selectedSongIds, lastSelectedIndex]);

  const handleSelectAll = useCallback(() => {
    const next = toggleSelectAll(songIds, selectedSongIds);
    setSelectedSongIds(next.selectedIds);
    setLastSelectedIndex(next.lastSelectedIndex);
  }, [songIds, selectedSongIds]);

  const clearSelection = useCallback(() => {
    setSelectedSongIds(new Set());
    setLastSelectedIndex(null);
  }, []);

  return {
    selectedSongIds,
    setSelectedSongIds,
    selectionMode,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
  };
}

// ─── useLibraryBatchActions ─────────────────────────────────────────────────

interface PlaylistOption {
  id: string;
  name: string;
  _count: { songs: number };
}

interface UseLibraryBatchActionsOptions {
  selectedSongIds: Set<string>;
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  clearSelection: () => void;
  toast: ToastFn;
  refreshRouter: () => void;
}

export function useLibraryBatchActions({
  selectedSongIds,
  songs,
  setSongs,
  clearSelection,
  toast,
  refreshRouter,
}: UseLibraryBatchActionsOptions) {
  const [batchLoading, setBatchLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Per-song menu delete state
  const [pendingMenuDelete, setPendingMenuDelete] = useState<{ song: Song } | null>(null);
  const [menuDeleteLoading, setMenuDeleteLoading] = useState(false);

  // Batch tag
  const { show: showBatchTagMenu, setShow: setShowBatchTagMenu, loading: batchTagLoading, setLoading: setBatchTagLoading, ref: batchTagMenuRef } = useMenuState();

  // Batch playlist
  const { show: showBatchPlaylistMenu, setShow: setShowBatchPlaylistMenu, loading: batchPlaylistLoading, setLoading: setBatchPlaylistLoading, ref: batchPlaylistMenuRef } = useMenuState();
  const [batchPlaylists, setBatchPlaylists] = useState<PlaylistOption[]>([]);

  // Batch download
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [batchDownloadProgress, setBatchDownloadProgress] = useState<{ completed: number; total: number } | null>(null);
  const { show: showBatchDownloadFormatMenu, setShow: setShowBatchDownloadFormatMenu, ref: batchDownloadFormatMenuRef } = useMenuState();
  const [batchDownloadFormat, setBatchDownloadFormat] = useState<AudioFormat>("mp3");

  type BatchActionType = Exclude<LibraryBatchAction, "tag" | "add_to_playlist">;

  const executeBatchAction = useCallback(async (action: BatchActionType) => {
    const songIds = Array.from(selectedSongIds);
    setBatchLoading(true);

    try {
      const result = await runSongsBatchAction({ action, songIds });
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      const count = result.affected;
      setSongs((prev) => applyBatchActionToSongs(prev, selectedSongIds, action));
      toast(batchActionMessage(action, count), "success");
      clearSelection();
    } catch {
      toast("Batch operation failed", "error");
    } finally {
      setBatchLoading(false);
      setShowDeleteConfirm(false);
    }
  }, [selectedSongIds, setSongs, clearSelection, toast]);

  const handleBatchAction = useCallback((action: BatchActionType) => {
    if (selectedSongIds.size === 0) return;

    if (action === "delete" || action === "permanent_delete") {
      setShowDeleteConfirm(true);
      return;
    }

    executeBatchAction(action);
  }, [selectedSongIds.size, executeBatchAction]);

  const handleBatchTag = useCallback(async (tagId: string) => {
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
      refreshRouter();
    } catch {
      toast("Batch tag failed", "error");
    } finally {
      setBatchTagLoading(false);
    }
  }, [selectedSongIds, clearSelection, toast, refreshRouter]);

  const handleBatchAddToPlaylist = useCallback(async (playlistId: string) => {
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
  }, [selectedSongIds, clearSelection, toast]);

  const openBatchPlaylistMenu = useCallback(async () => {
    setShowBatchPlaylistMenu(true);
    const playlists = await fetchPlaylistOptions();
    if (playlists.length > 0) {
      setBatchPlaylists(playlists);
    }
  }, []);

  const handleBatchDownload = useCallback(async (fmt: AudioFormat = batchDownloadFormat) => {
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
  }, [batchDownloadFormat, selectedSongIds, songs, clearSelection, toast]);

  const executePendingMenuDelete = useCallback(async () => {
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
  }, [pendingMenuDelete, setSongs, toast]);

  return {
    batchLoading,
    showDeleteConfirm,
    setShowDeleteConfirm,
    pendingMenuDelete,
    setPendingMenuDelete,
    menuDeleteLoading,
    handleBatchAction,
    executeBatchAction,
    executePendingMenuDelete,
    // Tag
    showBatchTagMenu,
    setShowBatchTagMenu,
    batchTagLoading,
    batchTagMenuRef,
    handleBatchTag,
    // Playlist
    showBatchPlaylistMenu,
    batchPlaylistLoading,
    batchPlaylists,
    batchPlaylistMenuRef,
    handleBatchAddToPlaylist,
    openBatchPlaylistMenu,
    // Download
    batchDownloading,
    batchDownloadProgress,
    showBatchDownloadFormatMenu,
    setShowBatchDownloadFormatMenu,
    batchDownloadFormat,
    setBatchDownloadFormat,
    batchDownloadFormatMenuRef,
    handleBatchDownload,
  };
}

// ─── useLibraryExport ───────────────────────────────────────────────────────

interface UseLibraryExportOptions {
  songs: Song[];
  toast: ToastFn;
}

export function useLibraryExport({ songs, toast }: UseLibraryExportOptions) {
  const { show: exportMenuOpen, setShow: setExportMenuOpen, ref: exportMenuRef } = useMenuState();
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ completed: number; total: number } | null>(null);

  const exportableSongs = useMemo<ExportableSong[]>(() => {
    return songs
      .filter((s) => s.audioUrl && s.generationStatus === "ready")
      .map((s) => ({
        id: s.id,
        title: s.title,
        audioUrl: s.audioUrl!,
        tags: s.tags,
        duration: s.duration,
        createdAt: s.createdAt,
      }));
  }, [songs]);

  const handleExportZip = useCallback(async () => {
    setExportMenuOpen(false);
    if (exportableSongs.length === 0) {
      toast("No songs available to export", "info");
      return;
    }
    if (exportableSongs.length > 50) {
      toast(`Exporting ${exportableSongs.length} songs — this may take a while`, "info");
    }
    setExporting(true);
    setExportProgress({ completed: 0, total: exportableSongs.length });
    try {
      await exportAsZip(exportableSongs, (completed, total) => {
        setExportProgress({ completed, total });
      });
      toast("ZIP export complete!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Export failed", "error");
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  }, [exportableSongs, toast]);

  const handleExportM3U = useCallback(() => {
    setExportMenuOpen(false);
    if (exportableSongs.length === 0) {
      toast("No songs available to export", "info");
      return;
    }
    try {
      exportAsM3U(exportableSongs);
      toast("M3U playlist exported!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Export failed", "error");
    }
  }, [exportableSongs, toast]);

  return {
    exportMenuOpen,
    setExportMenuOpen,
    exporting,
    exportProgress,
    exportMenuRef,
    exportableSongs,
    handleExportZip,
    handleExportM3U,
  };
}

// ─── useLibraryKeyboardNav ──────────────────────────────────────────────────

interface UseLibraryKeyboardNavOptions {
  songs: Song[];
  onTogglePlay: (song: Song) => void;
  onToggleFavorite: (song: Song) => void;
  onDeleteSong: (song: Song) => void;
}

export function useLibraryKeyboardNav({
  songs,
  onTogglePlay,
  onToggleFavorite,
  onDeleteSong,
}: UseLibraryKeyboardNavOptions) {
  const songListRef = useRef<HTMLDivElement>(null);

  const handleSongListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const list = songListRef.current;
      if (!list) return;
      const items = Array.from(list.querySelectorAll<HTMLElement>('[role="option"]'));
      if (items.length === 0) return;
      const currentIdx = items.findIndex((el) => el.contains(document.activeElement) || el === document.activeElement);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = currentIdx < items.length - 1 ? currentIdx + 1 : 0;
        items[next].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = currentIdx > 0 ? currentIdx - 1 : items.length - 1;
        items[prev].focus();
      } else if (e.key === "Enter" && currentIdx >= 0) {
        const song = songs[currentIdx];
        if (song) {
          e.preventDefault();
          onTogglePlay(song);
        }
      } else if (e.key === "f" && currentIdx >= 0) {
        const song = songs[currentIdx];
        if (song) {
          e.preventDefault();
          onToggleFavorite(song);
        }
      } else if (e.key === "Delete" && currentIdx >= 0) {
        const song = songs[currentIdx];
        if (song) {
          e.preventDefault();
          onDeleteSong(song);
        }
      }
    },
    [songs, onTogglePlay, onToggleFavorite, onDeleteSong]
  );

  return { songListRef, handleSongListKeyDown };
}

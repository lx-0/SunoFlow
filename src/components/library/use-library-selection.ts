"use client";

import { useRef, useState } from "react";
import type { Song } from "@prisma/client";
import { runSongsBatchAction, type LibraryBatchAction } from "@/lib/songs/library-client";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { toggleSelectAll, toggleSelection } from "./selection";

type BatchActionType = Exclude<LibraryBatchAction, "tag" | "add_to_playlist">;

interface UseLibrarySelectionParams {
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  smartFilter: string;
  toast: (msg: string, type: "success" | "error" | "info") => void;
}

export function useLibrarySelection({
  songs,
  setSongs,
  smartFilter,
  toast,
}: UseLibrarySelectionParams) {
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const [pendingMenuDelete, setPendingMenuDelete] = useState<{ song: Song } | null>(null);
  const [menuDeleteLoading, setMenuDeleteLoading] = useState(false);
  const batchDeleteDialogRef = useRef<HTMLDivElement>(null);
  const pendingDeleteDialogRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(batchDeleteDialogRef, showDeleteConfirm, () => setShowDeleteConfirm(false));
  useDialogFocusTrap(pendingDeleteDialogRef, Boolean(pendingMenuDelete), () => setPendingMenuDelete(null));

  const selectionMode = selectedSongIds.size > 0;
  const isArchiveView = smartFilter === "archived";

  function handleToggleSelect(songId: string, shiftKey: boolean) {
    const next = toggleSelection({
      songId,
      songIds: songs.map((song) => song.id),
      shiftKey,
      state: { selectedIds: selectedSongIds, lastSelectedIndex },
    });
    setSelectedSongIds(next.selectedIds);
    setLastSelectedIndex(next.lastSelectedIndex);
  }

  function handleSelectAll() {
    const next = toggleSelectAll(
      songs.map((song) => song.id),
      selectedSongIds,
    );
    setSelectedSongIds(next.selectedIds);
    setLastSelectedIndex(next.lastSelectedIndex);
  }

  function clearSelection() {
    setSelectedSongIds(new Set());
    setLastSelectedIndex(null);
  }

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

  return {
    selectedSongIds,
    setSelectedSongIds,
    selectionMode,
    isArchiveView,
    showDeleteConfirm,
    setShowDeleteConfirm,
    batchLoading,
    pendingMenuDelete,
    setPendingMenuDelete,
    menuDeleteLoading,
    batchDeleteDialogRef,
    pendingDeleteDialogRef,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    handleBatchAction,
    executeBatchAction,
    handleSingleSongAction,
    executePendingMenuDelete,
  };
}

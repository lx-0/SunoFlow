"use client";

import { useCallback, useRef, useState } from "react";
import type { Song } from "@prisma/client";
import { toggleSelection, toggleSelectAll } from "@/components/library/selection";
import { runSongsBatchAction, type LibraryBatchAction } from "@/lib/songs/library-client";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";

type BatchActionType = Exclude<LibraryBatchAction, "tag" | "add_to_playlist">;

interface UseLibrarySelectionOptions {
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  toast: (message: string, variant?: "success" | "error" | "info") => void;
}

export function useLibrarySelection({
  songs,
  setSongs,
  toast,
}: UseLibrarySelectionOptions) {
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const batchDeleteDialogRef = useRef<HTMLDivElement>(null);

  const selectionMode = selectedSongIds.size > 0;

  useDialogFocusTrap(batchDeleteDialogRef, showDeleteConfirm, () =>
    setShowDeleteConfirm(false)
  );

  const clearSelection = useCallback(() => {
    setSelectedSongIds(new Set());
    setLastSelectedIndex(null);
  }, []);

  const handleToggleSelect = useCallback(
    (songId: string, shiftKey: boolean) => {
      const songIds = songs.map((s) => s.id);
      const result = toggleSelection({
        songId,
        songIds,
        shiftKey,
        state: { selectedIds: selectedSongIds, lastSelectedIndex },
      });
      setSelectedSongIds(result.selectedIds);
      setLastSelectedIndex(result.lastSelectedIndex);
    },
    [songs, selectedSongIds, lastSelectedIndex]
  );

  const handleSelectAll = useCallback(() => {
    const songIds = songs.map((s) => s.id);
    const result = toggleSelectAll(songIds, selectedSongIds);
    setSelectedSongIds(result.selectedIds);
    setLastSelectedIndex(result.lastSelectedIndex);
  }, [songs, selectedSongIds]);

  const executeBatchAction = useCallback(
    async (action: BatchActionType) => {
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
    },
    [selectedSongIds, setSongs, toast, clearSelection]
  );

  const handleBatchAction = useCallback(
    (action: BatchActionType) => {
      if (action === "delete" || action === "permanent_delete") {
        setShowDeleteConfirm(true);
      } else {
        executeBatchAction(action);
      }
    },
    [executeBatchAction]
  );

  return {
    selectedSongIds,
    setSelectedSongIds,
    lastSelectedIndex,
    showDeleteConfirm,
    setShowDeleteConfirm,
    batchLoading,
    selectionMode,
    batchDeleteDialogRef,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    handleBatchAction,
    executeBatchAction,
  };
}

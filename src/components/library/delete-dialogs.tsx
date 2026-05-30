import type { Song } from "@prisma/client";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface LibraryDeleteDialogsProps {
  showBatchDelete: boolean;
  onCloseBatchDelete: () => void;
  selectedCount: number;
  isArchiveView: boolean;
  batchLoading: boolean;
  onConfirmBatchDelete: () => void;
  pendingMenuDelete: { song: Song } | null;
  onCloseSingleDelete: () => void;
  menuDeleteLoading: boolean;
  onConfirmSingleDelete: () => void;
}

export function LibraryDeleteDialogs({
  showBatchDelete,
  onCloseBatchDelete,
  selectedCount,
  isArchiveView,
  batchLoading,
  onConfirmBatchDelete,
  pendingMenuDelete,
  onCloseSingleDelete,
  menuDeleteLoading,
  onConfirmSingleDelete,
}: LibraryDeleteDialogsProps) {
  return (
    <>
      <ConfirmDialog
        open={showBatchDelete}
        title={
          isArchiveView
            ? `Permanently delete ${selectedCount} song${selectedCount !== 1 ? "s" : ""}?`
            : `Delete ${selectedCount} song${selectedCount !== 1 ? "s" : ""}?`
        }
        description={
          isArchiveView
            ? "This action cannot be undone. The selected songs will be permanently removed from your library."
            : "The selected songs will be moved to your archive. You can restore them later."
        }
        confirmLabel={isArchiveView ? "Delete forever" : "Delete"}
        loadingLabel={isArchiveView ? "Deleting forever…" : "Archiving…"}
        danger
        loading={batchLoading}
        onConfirm={onConfirmBatchDelete}
        onClose={onCloseBatchDelete}
      />

      <ConfirmDialog
        open={Boolean(pendingMenuDelete)}
        title={`Permanently delete "${pendingMenuDelete?.song.title ?? "this song"}"?`}
        description="This action cannot be undone. The song will be permanently removed from your library."
        confirmLabel="Delete forever"
        loadingLabel="Deleting…"
        danger
        loading={menuDeleteLoading}
        onConfirm={onConfirmSingleDelete}
        onClose={onCloseSingleDelete}
      />
    </>
  );
}

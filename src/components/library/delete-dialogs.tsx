import { useRef } from "react";
import type { Song } from "@prisma/client";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";

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
  const batchDeleteDialogRef = useRef<HTMLDivElement>(null);
  const pendingDeleteDialogRef = useRef<HTMLDivElement>(null);

  useDialogFocusTrap(batchDeleteDialogRef, showBatchDelete, onCloseBatchDelete);
  useDialogFocusTrap(pendingDeleteDialogRef, Boolean(pendingMenuDelete), onCloseSingleDelete);

  return (
    <>
      {showBatchDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div
            ref={batchDeleteDialogRef}
            tabIndex={-1}
            className="bg-white dark:bg-gray-900 w-full sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 sm:mx-4 sm:max-w-sm"
          >
            <h3 id="delete-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              {isArchiveView
                ? `Permanently delete ${selectedCount} song${selectedCount !== 1 ? "s" : ""}?`
                : `Delete ${selectedCount} song${selectedCount !== 1 ? "s" : ""}?`}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {isArchiveView
                ? "This action cannot be undone. The selected songs will be permanently removed from your library."
                : "The selected songs will be moved to your archive. You can restore them later."}
            </p>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={onCloseBatchDelete}
                disabled={batchLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmBatchDelete}
                disabled={batchLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                {batchLoading
                  ? (isArchiveView ? "Deleting forever…" : "Archiving…")
                  : (isArchiveView ? "Delete forever" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingMenuDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="menu-delete-dialog-title"
        >
          <div
            ref={pendingDeleteDialogRef}
            tabIndex={-1}
            className="bg-white dark:bg-gray-900 w-full sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 sm:mx-4 sm:max-w-sm"
          >
            <h3 id="menu-delete-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Permanently delete &ldquo;{pendingMenuDelete.song.title ?? "this song"}&rdquo;?
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              This action cannot be undone. The song will be permanently removed from your library.
            </p>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={onCloseSingleDelete}
                disabled={menuDeleteLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmSingleDelete}
                disabled={menuDeleteLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                {menuDeleteLoading ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

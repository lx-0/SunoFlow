"use client";

import {
  TrashIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface BatchToolbarProps {
  batch: {
    selectionMode: boolean;
    selectedSongIds: ReadonlySet<string>;
    batchDownloading: boolean;
    batchDownloadProgress: { completed: number; total: number } | null;
    batchLoading: boolean;
    showBatchDeleteConfirm: boolean;
    handleBatchDownload: () => void;
    handleBatchRemoveFromPlaylist: () => void;
    setShowBatchDeleteConfirm: (v: boolean) => void;
    setSelectedSongIds: (v: Set<string>) => void;
  };
}

export function BatchToolbar({ batch }: BatchToolbarProps) {
  return (
    <>
      {batch.selectionMode && (
        <div className="fixed bottom-20 md:bottom-4 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl shadow-2xl border border-gray-700 animate-slide-in">
          <span className="text-sm font-medium mr-1 flex-shrink-0">
            {batch.selectedSongIds.size} selected
          </span>
          <button
            onClick={batch.handleBatchDownload}
            disabled={batch.batchDownloading}
            aria-label="Download selected songs as ZIP"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span className="hidden sm:inline">
              {batch.batchDownloading && batch.batchDownloadProgress
                ? `${batch.batchDownloadProgress.completed}/${batch.batchDownloadProgress.total}`
                : "Download"}
            </span>
          </button>
          <button
            onClick={() => batch.setShowBatchDeleteConfirm(true)}
            disabled={batch.batchLoading}
            aria-label="Remove selected from playlist"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <TrashIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Remove</span>
          </button>
          <button
            onClick={() => batch.setSelectedSongIds(new Set())}
            aria-label="Clear selection"
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {batch.showBatchDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-remove-dialog-title"
          onKeyDown={(e) => { if (e.key === "Escape") batch.setShowBatchDeleteConfirm(false); }}
        >
          <div className="bg-white dark:bg-gray-900 w-full sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 sm:mx-4 sm:max-w-sm">
            <h3 id="batch-remove-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Remove {batch.selectedSongIds.size} song{batch.selectedSongIds.size !== 1 ? "s" : ""} from playlist?
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              The songs will remain in your library.
            </p>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => batch.setShowBatchDeleteConfirm(false)}
                disabled={batch.batchLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={batch.handleBatchRemoveFromPlaylist}
                disabled={batch.batchLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                {batch.batchLoading ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

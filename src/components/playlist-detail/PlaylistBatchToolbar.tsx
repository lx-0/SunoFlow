"use client";

import { Download, Trash2, X } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

interface PlaylistBatchToolbarProps {
  selectedCount: number;
  batchDownloading: boolean;
  batchDownloadProgress: { completed: number; total: number } | null;
  batchLoading: boolean;
  onDownload: () => void;
  onRemove: () => void;
  onClearSelection: () => void;
}

export function PlaylistBatchToolbar({
  selectedCount,
  batchDownloading,
  batchDownloadProgress,
  batchLoading,
  onDownload,
  onRemove,
  onClearSelection,
}: PlaylistBatchToolbarProps) {
  return (
    <div className="fixed bottom-20 md:bottom-4 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl shadow-2xl border border-gray-700 animate-slide-in">
      <span className="text-sm font-medium mr-1 flex-shrink-0">
        {selectedCount} selected
      </span>
      <button
        onClick={onDownload}
        disabled={batchDownloading}
        aria-label="Download selected songs as ZIP"
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors min-h-[44px]"
      >
        <Icon icon={Download} className="w-4 h-4" />
        <span className="hidden sm:inline">
          {batchDownloading && batchDownloadProgress
            ? `${batchDownloadProgress.completed}/${batchDownloadProgress.total}`
            : "Download"}
        </span>
      </button>
      <button
        onClick={onRemove}
        disabled={batchLoading}
        aria-label="Remove selected from playlist"
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors min-h-[44px]"
      >
        <Icon icon={Trash2} className="w-4 h-4" />
        <span className="hidden sm:inline">Remove</span>
      </button>
      <button
        onClick={onClearSelection}
        aria-label="Clear selection"
        className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
      >
        <Icon icon={X} className="w-4 h-4" />
      </button>
    </div>
  );
}

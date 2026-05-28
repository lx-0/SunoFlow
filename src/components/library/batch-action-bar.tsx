import {
  HeartIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  TagIcon,
  ArrowsRightLeftIcon,
  LockClosedIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import {
  HeartIcon as HeartOutlineIcon,
  QueueListIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import type { AudioFormat } from "@/lib/export";
import type { UseLibraryBatchActionsReturn, PlaylistOption } from "@/hooks/useLibraryBatchActions";

interface LibraryBatchActionBarProps {
  selectedSongIds: Set<string>;
  isArchiveView: boolean;
  availableTags: { id: string; name: string; color: string }[];
  onCompare: (idA: string, idB: string) => void;
  onClearSelection: () => void;
  batch: UseLibraryBatchActionsReturn;
}

export function LibraryBatchActionBar({
  selectedSongIds,
  isArchiveView,
  availableTags,
  onCompare,
  onClearSelection,
  batch,
}: LibraryBatchActionBarProps) {
  return (
    <div className="fixed bottom-20 md:bottom-4 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl shadow-2xl border border-gray-700 animate-slide-in overflow-x-auto">
      <span className="text-sm font-medium mr-1 flex-shrink-0">
        {selectedSongIds.size} selected
      </span>

      <button
        onClick={() => batch.handleBatchAction("favorite")}
        disabled={batch.batchLoading}
        aria-label="Add selected to favorites"
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-pink-600 hover:bg-pink-500 disabled:opacity-50 transition-colors min-h-[44px]"
      >
        <HeartIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Favorite</span>
      </button>

      <button
        onClick={() => batch.handleBatchAction("unfavorite")}
        disabled={batch.batchLoading}
        aria-label="Remove selected from favorites"
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors min-h-[44px]"
      >
        <HeartOutlineIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Unfavorite</span>
      </button>

      <button
        onClick={() => batch.handleBatchAction("make_public")}
        disabled={batch.batchLoading}
        aria-label="Make selected songs public"
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-colors min-h-[44px]"
      >
        <GlobeAltIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Make Public</span>
      </button>

      <button
        onClick={() => batch.handleBatchAction("make_private")}
        disabled={batch.batchLoading}
        aria-label="Make selected songs private"
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors min-h-[44px]"
      >
        <LockClosedIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Make Private</span>
      </button>

      {/* Batch Tag */}
      <div className="relative" ref={batch.batchTagMenuRef}>
        <button
          onClick={() => batch.setShowBatchTagMenu((o) => !o)}
          disabled={batch.batchTagLoading || availableTags.length === 0}
          aria-label="Tag selected songs"
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-colors min-h-[44px]"
        >
          <TagIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Tag</span>
        </button>

        {batch.showBatchTagMenu && (
          <div className="absolute bottom-full mb-1 left-0 w-48 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
            {availableTags.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500">No tags yet</p>
            ) : (
              availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => batch.handleBatchTag(tag.id)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-b last:border-b-0 border-gray-200 dark:border-gray-800 flex items-center gap-2"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Batch Add to Playlist */}
      <div className="relative" ref={batch.batchPlaylistMenuRef}>
        <button
          onClick={batch.openBatchPlaylistMenu}
          disabled={batch.batchPlaylistLoading}
          aria-label="Add selected to playlist"
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors min-h-[44px]"
        >
          <QueueListIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Playlist</span>
        </button>

        {batch.showBatchPlaylistMenu && (
          <div className="absolute bottom-full mb-1 left-0 w-48 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
            {batch.batchPlaylists.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500">No playlists yet</p>
            ) : (
              batch.batchPlaylists.map((pl: PlaylistOption) => (
                <button
                  key={pl.id}
                  onClick={() => batch.handleBatchAddToPlaylist(pl.id)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-b last:border-b-0 border-gray-200 dark:border-gray-800"
                >
                  {pl.name}
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    ({pl._count.songs})
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Batch Download with format picker */}
      <div className="relative flex-shrink-0" ref={batch.batchDownloadFormatMenuRef}>
        <div className="flex items-stretch">
          <button
            onClick={() => batch.handleBatchDownload()}
            disabled={batch.batchDownloading}
            aria-label="Download selected songs as ZIP"
            className="flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-l-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span className="hidden sm:inline">
              {batch.batchDownloading && batch.batchDownloadProgress
                ? `${batch.batchDownloadProgress.completed}/${batch.batchDownloadProgress.total}`
                : `${batch.batchDownloadFormat.toUpperCase()} ZIP`}
            </span>
          </button>
          <button
            onClick={() => batch.setShowBatchDownloadFormatMenu((v) => !v)}
            disabled={batch.batchDownloading}
            aria-label="Choose batch download format"
            className="flex items-center justify-center px-1.5 py-2 rounded-r-lg bg-gray-700 hover:bg-gray-600 text-white border-l border-gray-600 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <ChevronDownIcon className={`w-3 h-3 transition-transform duration-150 ${batch.showBatchDownloadFormatMenu ? "rotate-180" : ""}`} />
          </button>
        </div>
        {batch.showBatchDownloadFormatMenu && (
          <div className="absolute bottom-full mb-1 left-0 w-40 bg-gray-900 border border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden py-1 text-sm">
            {(["mp3", "wav", "flac"] as AudioFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => { batch.setBatchDownloadFormat(fmt); batch.handleBatchDownload(fmt); }}
                className={`w-full text-left px-3 py-2 transition-colors ${batch.batchDownloadFormat === fmt ? "bg-gray-700 text-white" : "hover:bg-gray-800 text-gray-300"}`}
              >
                {fmt.toUpperCase()}
                {fmt === "mp3" && <span className="ml-1 text-xs text-gray-500">· default</span>}
                {(fmt === "wav" || fmt === "flac") && <span className="ml-1 text-xs text-gray-500">· WAV source</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Compare (only when exactly 2 songs selected) */}
      {selectedSongIds.size === 2 && (() => {
        const [idA, idB] = Array.from(selectedSongIds);
        return (
          <button
            onClick={() => onCompare(idA, idB)}
            aria-label="Compare selected songs"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 transition-colors min-h-[44px]"
          >
            <ArrowsRightLeftIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Compare</span>
          </button>
        );
      })()}

      {isArchiveView ? (
        <>
          <button
            onClick={() => batch.handleBatchAction("restore")}
            disabled={batch.batchLoading}
            aria-label="Restore selected songs"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Restore</span>
          </button>
          <button
            onClick={() => batch.handleBatchAction("permanent_delete")}
            disabled={batch.batchLoading}
            aria-label="Permanently delete selected songs"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <TrashIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Delete forever</span>
          </button>
        </>
      ) : (
        <button
          onClick={() => batch.handleBatchAction("delete")}
          disabled={batch.batchLoading}
          aria-label="Delete selected songs"
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors min-h-[44px]"
        >
          <TrashIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Delete</span>
        </button>
      )}

      <button
        onClick={onClearSelection}
        aria-label="Clear selection"
        className="flex-shrink-0 ml-1 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors min-h-[44px]"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MusicalNoteIcon,
  ArrowDownTrayIcon,
  HeartIcon,
  ArrowUpOnSquareStackIcon,
  TrashIcon,
  CheckIcon,
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
import { PlayIcon as PlayOutlineIcon } from "@heroicons/react/24/outline";
import type { Song } from "@prisma/client";
import type { AudioFormat } from "@/lib/export";
import { useToast } from "./Toast";
import { useQueue } from "./QueueContext";
import { RecentlyPlayed } from "./RecentlyPlayed";
import { LowCreditsBanner } from "./LowCreditsBanner";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { formatBytes } from "@/lib/cache/offline";
import { LibraryToolbar } from "./LibraryToolbar";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useLibraryPullToRefresh } from "@/hooks/useLibraryPullToRefresh";
import { useLibraryFilterState } from "@/hooks/useLibraryFilterState";
import { useSongsList, type SongsFilters } from "@/hooks/useSongsList";
import { useTagsList } from "@/hooks/useTagsList";
import { SongGridCard } from "./library/song-grid-card";
import { SwipableSongRow } from "./library/swipable-song-row";
import { useLibrarySongActions } from "./library/use-library-song-actions";
import { useLibrarySelection } from "./library/use-library-selection";
import { useLibraryBatchMenus } from "./library/use-library-batch-menus";
import { useLibraryExport } from "./library/use-library-export";

interface LibraryViewProps {
  initialSongs: Song[];
  title?: string;
  enableServerSearch?: boolean;
}


export function LibraryView({
  initialSongs,
  title = "Library",
  enableServerSearch = true,
}: LibraryViewProps) {
  const { toast } = useToast();
  const router = useRouter();
  const {
    queue,
    currentIndex,
    isPlaying,
    currentTime,
    duration: audioDuration,
    togglePlay,
    playQueue,
    seek,
  } = useQueue();

  const currentSongId = currentIndex >= 0 ? queue[currentIndex]?.id ?? null : null;
  const {
    searchText,
    setSearchText,
    statusFilter,
    setStatusFilter,
    ratingFilter,
    setRatingFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sortBy,
    setSortBy,
    tagFilter,
    setTagFilter,
    smartFilter,
    setSmartFilter,
    genreFilter,
    setGenreFilter,
    moodFilter,
    setMoodFilter,
    tempoMin,
    setTempoMin,
    tempoMax,
    setTempoMax,
    includeVariations,
    setIncludeVariations,
    debouncedSearch,
    hasAnyFilter,
    hasActiveFilters,
    clearAllFilters,
  } = useLibraryFilterState({ enableServerSearch });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    if (typeof window === "undefined") return "list";
    try {
      return (localStorage.getItem("library-view-mode") as "list" | "grid") ?? "list";
    } catch {
      return "list";
    }
  });
  const [availableTags, setAvailableTags] = useState<{ id: string; name: string; color: string; _count?: { songTags: number } }[]>([]);

  // ─── Song + playback state ────────────────────────────────────────────────
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalSongs, setTotalSongs] = useState<number>(initialSongs.length);

  const { pullDistance, isPullingRefresh } = useLibraryPullToRefresh({
    onRefresh: async () => {
      await songsQuery.refetch();
    },
  });

  // ─── Offline cache ────────────────────────────────────────────────────────
  const { cachedIds, stats: offlineStats, saving: offlineSaving, saveOffline, removeOffline, clearAll: clearOffline } = useOfflineCache();
  const isOnline = useOnlineStatus();

  // ─── Extracted hooks ──────────────────────────────────────────────────────

  const handleSongUpdate = useCallback((updated: Song) => {
    setSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  const songActions = useLibrarySongActions({
    songs,
    currentSongId,
    togglePlay,
    playQueue,
    seek,
    toast,
    router,
    onSongUpdate: handleSongUpdate,
  });

  const selection = useLibrarySelection({
    songs,
    setSongs,
    smartFilter,
    toast,
  });

  const batchMenus = useLibraryBatchMenus({
    songs,
    selectedSongIds: selection.selectedSongIds,
    clearSelection: selection.clearSelection,
    toast,
    router,
  });

  const libraryExport = useLibraryExport({ songs, toast });

  // Arrow-key navigation for song list
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
          songActions.handleTogglePlay(song);
        }
      } else if (e.key === "f" && currentIdx >= 0) {
        const song = songs[currentIdx];
        if (song) {
          e.preventDefault();
          songActions.handleToggleFavorite(song);
        }
      } else if (e.key === "Delete" && currentIdx >= 0) {
        const song = songs[currentIdx];
        if (song) {
          e.preventDefault();
          selection.setSelectedSongIds(new Set([song.id]));
          selection.setShowDeleteConfirm(true);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [songs]
  );

  // ─── Fetch user tags for filter ───────────────────────────────────────────
  const tagsQuery = useTagsList();
  useEffect(() => {
    if (tagsQuery.data) setAvailableTags(tagsQuery.data);
  }, [tagsQuery.data]);

  // ─── Songs query (filter change, load-more, refresh, pending-poll) ───────
  const songsFilters: SongsFilters = useMemo(() => ({
    q: debouncedSearch || undefined,
    status: statusFilter || undefined,
    minRating: ratingFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortBy: sortBy || undefined,
    tagIds: tagFilter.length > 0 ? tagFilter : undefined,
    smartFilter: smartFilter && smartFilter !== "archived" ? smartFilter : undefined,
    archived: smartFilter === "archived" || undefined,
    genre: genreFilter.length > 0 ? genreFilter : undefined,
    mood: moodFilter.length > 0 ? moodFilter : undefined,
    tempoMin: tempoMin || undefined,
    tempoMax: tempoMax || undefined,
    includeVariations: includeVariations || undefined,
  }), [debouncedSearch, statusFilter, ratingFilter, dateFrom, dateTo, sortBy, tagFilter, smartFilter, genreFilter, moodFilter, tempoMin, tempoMax, includeVariations]);

  const songsQuery = useSongsList(songsFilters, {
    enabled: enableServerSearch,
    pollWhilePending: enableServerSearch,
  });

  useEffect(() => {
    if (!songsQuery.data) return;
    const allSongs = songsQuery.data.pages.flatMap((p) => p.songs);
    setSongs(allSongs);
    const lastPage = songsQuery.data.pages.at(-1);
    setNextCursor(lastPage?.nextCursor ?? null);
    setTotalSongs(lastPage?.total ?? allSongs.length);
  }, [songsQuery.data]);

  useEffect(() => {
    setLoading(songsQuery.isPending && songs.length === 0);
  }, [songsQuery.isPending, songs.length]);

  useEffect(() => {
    setLoadingMore(songsQuery.isFetchingNextPage);
  }, [songsQuery.isFetchingNextPage]);

  const handleLoadMore = useCallback(() => {
    if (!songsQuery.hasNextPage || songsQuery.isFetchingNextPage) return;
    songsQuery.fetchNextPage();
  }, [songsQuery]);

  const hasPlayableSongs = songs.some((s) => s.audioUrl && s.generationStatus === "ready");

  // ─── Virtualizer for list view ───────────────────────────────────────────
  const listScrollMarginRef = useRef(0);
  useLayoutEffect(() => {
    listScrollMarginRef.current = songListRef.current?.offsetTop ?? 0;
  });

  const rowVirtualizer = useWindowVirtualizer({
    count: viewMode === "list" ? songs.length : 0,
    estimateSize: () => 120,
    overscan: 5,
    scrollMargin: listScrollMarginRef.current,
  });

  // ─── Infinite scroll sentinel ────────────────────────────────────────────
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !nextCursor || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, handleLoadMore]);

  return (
    <div className="px-4 py-4 space-y-4" data-tour="library">
      {/* Pull-to-refresh indicator (mobile only) */}
      {(pullDistance > 0 || isPullingRefresh) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all"
          style={{ height: isPullingRefresh ? 48 : pullDistance }}
        >
          <ArrowPathIcon
            className={`w-5 h-5 text-violet-500 transition-transform ${isPullingRefresh ? "animate-spin" : ""}`}
            style={{ transform: isPullingRefresh ? undefined : `rotate(${pullDistance * 4.5}deg)` }}
          />
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {isPullingRefresh ? "Refreshing…" : pullDistance >= 60 ? "Release to refresh" : "Pull to refresh"}
          </span>
        </div>
      )}

      {/* Low credits banner — shown when user is running low */}
      <LowCreditsBanner />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {loading ? "Searching…" : `${songs.length}${totalSongs > songs.length ? ` of ${totalSongs}` : ""} song${totalSongs !== 1 ? "s" : ""}`}
          </p>
          {songs.length > 0 && (
            <button
              onClick={selection.handleSelectAll}
              className="mt-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors"
            >
              {selection.selectedSongIds.size === songs.length ? "Deselect all" : "Select all"}
            </button>
          )}
          {offlineStats.count > 0 && (
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <CheckIcon className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
              <span>{offlineStats.count} offline · {formatBytes(offlineStats.totalBytes)}</span>
              <button
                onClick={clearOffline}
                className="text-red-500 hover:text-red-400 transition-colors"
                aria-label="Clear all offline songs"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2">
        {/* Export button */}
        <div className="relative" ref={libraryExport.exportMenuRef}>
          <button
            onClick={() => libraryExport.setExportMenuOpen((o) => !o)}
            disabled={libraryExport.exporting}
            aria-label="Export library"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              libraryExport.exporting
                ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
            }`}
          >
            <ArrowUpOnSquareStackIcon className="w-4 h-4" />
            {libraryExport.exporting && libraryExport.exportProgress
              ? `${libraryExport.exportProgress.completed}/${libraryExport.exportProgress.total}`
              : "Export"}
          </button>

          {libraryExport.exportMenuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg z-20 overflow-hidden">
              <button
                onClick={libraryExport.handleExportZip}
                className="w-full text-left px-4 py-3 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Download as ZIP
              </button>
              <button
                onClick={libraryExport.handleExportM3U}
                className="w-full text-left px-4 py-3 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-t border-gray-200 dark:border-gray-800"
              >
                Export M3U playlist
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Export progress bar */}
      {libraryExport.exporting && libraryExport.exportProgress && (
        <div className="space-y-1">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.round((libraryExport.exportProgress.completed / libraryExport.exportProgress.total) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Downloading {libraryExport.exportProgress.completed} of {libraryExport.exportProgress.total} songs…
          </p>
        </div>
      )}

      {/* Play All button */}
      {hasPlayableSongs && !selection.selectionMode && (
        <button
          onClick={songActions.handlePlayAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors min-h-[44px]"
        >
          <PlayOutlineIcon className="w-4 h-4" />
          Play All
        </button>
      )}

      {/* Recently Played — only show on default (non-filtered, non-search) library view */}
      {enableServerSearch && !searchText && !statusFilter && !ratingFilter && tagFilter.length === 0 && !smartFilter && (
        <RecentlyPlayed />
      )}

      {/* Search bar + filters */}
      {enableServerSearch && (
        <LibraryToolbar
          searchText={searchText}
          setSearchText={setSearchText}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={hasActiveFilters}
          viewMode={viewMode}
          setViewMode={setViewMode}
          smartFilter={smartFilter}
          setSmartFilter={setSmartFilter}
          includeVariations={includeVariations}
          setIncludeVariations={setIncludeVariations}
          sortBy={sortBy}
          setSortBy={setSortBy}
          hasAnyFilter={hasAnyFilter}
          clearAllFilters={clearAllFilters}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          ratingFilter={ratingFilter}
          setRatingFilter={setRatingFilter}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          availableTags={availableTags}
          tagFilter={tagFilter}
          setTagFilter={setTagFilter}
          genreFilter={genreFilter}
          setGenreFilter={setGenreFilter}
          moodFilter={moodFilter}
          setMoodFilter={setMoodFilter}
          tempoMin={tempoMin}
          setTempoMin={setTempoMin}
          tempoMax={tempoMax}
          setTempoMax={setTempoMax}
        />
      )}

      {/* Song list */}
      {songs.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
          <MusicalNoteIcon className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-700 mb-3" aria-hidden="true" />
          {selection.isArchiveView ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">Your archive is empty.</p>
          ) : hasAnyFilter ? (
            <>
              <p className="text-gray-500 dark:text-gray-400 text-sm">No songs match your filters.</p>
              <button
                onClick={clearAllFilters}
                className="mt-3 px-4 py-2 rounded-lg text-sm font-medium text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
              >
                Clear all filters
              </button>
            </>
          ) : (
            <>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No songs yet</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                Create your first AI-generated song — describe a mood, genre, or vibe and let the music flow.
              </p>
              <Link
                href="/generate"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Generate your first song
              </Link>
            </>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <ul aria-label="Song library" className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 ${selection.selectionMode ? "pb-20" : ""}`}>
          {songs.map((song, idx) => (
            <SongGridCard
              key={song.id}
              song={song}
              isActive={currentSongId === song.id}
              isPlaying={isPlaying}
              isSelected={selection.selectedSongIds.has(song.id)}
              selectionMode={selection.selectionMode}
              searchQuery={debouncedSearch}
              priority={idx < 4}
              onTogglePlay={songActions.handleTogglePlay}
              onToggleFavorite={songActions.handleToggleFavorite}
              onToggleSelect={(songId) => selection.handleToggleSelect(songId, false)}
              onLongPress={(songId) => selection.setSelectedSongIds(new Set([songId]))}
            />
          ))}
        </ul>
      ) : (
        <div
          ref={songListRef}
          aria-label="Song library"
          role="listbox"
          aria-orientation="vertical"
          onKeyDown={handleSongListKeyDown}
          className={selection.selectionMode ? "pb-20" : ""}
          style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const song = songs[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                  paddingBottom: "0.5rem",
                }}
              >
                <SwipableSongRow
                  key={song.id}
                  initialSong={song}
                  isActive={currentSongId === song.id}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  audioDuration={audioDuration}
                  rating={song.rating ? { stars: song.rating, note: song.ratingNote ?? "" } : undefined}
                  downloadProgress={songActions.downloadProgress[song.id] ?? null}
                  downloadError={songActions.downloadErrors[song.id] ?? null}
                  isSelected={selection.selectedSongIds.has(song.id)}
                  selectionMode={selection.selectionMode}
                  searchQuery={debouncedSearch}
                  isCached={cachedIds.has(song.id)}
                  isSaving={offlineSaving.has(song.id)}
                  isOnline={isOnline}
                  onTogglePlay={songActions.handleTogglePlay}
                  onDownload={songActions.handleDownload}
                  onSaveOffline={(s) => saveOffline({ id: s.id, title: s.title, imageUrl: s.imageUrl })}
                  onRemoveOffline={removeOffline}
                  onSeek={songActions.handleSeek}
                  onUpdate={handleSongUpdate}
                  onToggleFavorite={songActions.handleToggleFavorite}
                  onToggleSelect={selection.handleToggleSelect}
                  onLongPress={(songId) => selection.setSelectedSongIds(new Set([songId]))}
                  onRetry={songActions.handleRetry}
                  retryingId={songActions.retryingId}
                  isArchiveView={selection.isArchiveView}
                  onSingleArchive={(s) => selection.handleSingleSongAction(s, "delete")}
                  onSingleRestore={(s) => selection.handleSingleSongAction(s, "restore")}
                  onSingleDeleteForever={(s) => selection.handleSingleSongAction(s, "permanent_delete")}
                  onTagClick={(tagId) => setTagFilter((prev) => prev.includes(tagId) ? prev : [...prev, tagId])}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Infinite scroll sentinel + loading indicator */}
      {nextCursor && !loading && (
        <div ref={loadMoreSentinelRef} className="flex items-center justify-center py-4" aria-live="polite">
          {loadingMore ? (
            <span className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading more…
            </span>
          ) : (
            <button
              onClick={handleLoadMore}
              className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
            >
              Load more ({totalSongs - songs.length} remaining)
            </button>
          )}
        </div>
      )}

      {/* Batch download progress bar */}
      {batchMenus.batchDownloading && batchMenus.batchDownloadProgress && (
        <div className="space-y-1">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.round((batchMenus.batchDownloadProgress.completed / batchMenus.batchDownloadProgress.total) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Downloading {batchMenus.batchDownloadProgress.completed} of {batchMenus.batchDownloadProgress.total} songs…
          </p>
        </div>
      )}

      {/* Floating action bar */}
      {selection.selectionMode && (
        <div className="fixed bottom-20 md:bottom-4 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl shadow-2xl border border-gray-700 animate-slide-in overflow-x-auto">
          <span className="text-sm font-medium mr-1 flex-shrink-0">
            {selection.selectedSongIds.size} selected
          </span>

          <button
            onClick={() => selection.handleBatchAction("favorite")}
            disabled={selection.batchLoading}
            aria-label="Add selected to favorites"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-pink-600 hover:bg-pink-500 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <HeartIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Favorite</span>
          </button>

          <button
            onClick={() => selection.handleBatchAction("unfavorite")}
            disabled={selection.batchLoading}
            aria-label="Remove selected from favorites"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <HeartOutlineIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Unfavorite</span>
          </button>

          {/* Batch Make Public */}
          <button
            onClick={() => selection.handleBatchAction("make_public")}
            disabled={selection.batchLoading}
            aria-label="Make selected songs public"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <GlobeAltIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Make Public</span>
          </button>

          {/* Batch Make Private */}
          <button
            onClick={() => selection.handleBatchAction("make_private")}
            disabled={selection.batchLoading}
            aria-label="Make selected songs private"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <LockClosedIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Make Private</span>
          </button>

          {/* Batch Tag */}
          <div className="relative" ref={batchMenus.batchTagMenuRef}>
            <button
              onClick={() => batchMenus.setShowBatchTagMenu((o) => !o)}
              disabled={batchMenus.batchTagLoading || availableTags.length === 0}
              aria-label="Tag selected songs"
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-colors min-h-[44px]"
            >
              <TagIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Tag</span>
            </button>

            {batchMenus.showBatchTagMenu && (
              <div className="absolute bottom-full mb-1 left-0 w-48 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
                {availableTags.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">No tags yet</p>
                ) : (
                  availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => batchMenus.handleBatchTag(tag.id)}
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
          <div className="relative" ref={batchMenus.batchPlaylistMenuRef}>
            <button
              onClick={batchMenus.openBatchPlaylistMenu}
              disabled={batchMenus.batchPlaylistLoading}
              aria-label="Add selected to playlist"
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors min-h-[44px]"
            >
              <QueueListIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Playlist</span>
            </button>

            {batchMenus.showBatchPlaylistMenu && (
              <div className="absolute bottom-full mb-1 left-0 w-48 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
                {batchMenus.batchPlaylists.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">No playlists yet</p>
                ) : (
                  batchMenus.batchPlaylists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => batchMenus.handleBatchAddToPlaylist(pl.id)}
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
          <div className="relative flex-shrink-0" ref={batchMenus.batchDownloadFormatMenuRef}>
            <div className="flex items-stretch">
              <button
                onClick={() => batchMenus.handleBatchDownload()}
                disabled={batchMenus.batchDownloading}
                aria-label="Download selected songs as ZIP"
                className="flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-l-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {batchMenus.batchDownloading && batchMenus.batchDownloadProgress
                    ? `${batchMenus.batchDownloadProgress.completed}/${batchMenus.batchDownloadProgress.total}`
                    : `${batchMenus.batchDownloadFormat.toUpperCase()} ZIP`}
                </span>
              </button>
              <button
                onClick={() => batchMenus.setShowBatchDownloadFormatMenu((v) => !v)}
                disabled={batchMenus.batchDownloading}
                aria-label="Choose batch download format"
                className="flex items-center justify-center px-1.5 py-2 rounded-r-lg bg-gray-700 hover:bg-gray-600 text-white border-l border-gray-600 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                <ChevronDownIcon className={`w-3 h-3 transition-transform duration-150 ${batchMenus.showBatchDownloadFormatMenu ? "rotate-180" : ""}`} />
              </button>
            </div>
            {batchMenus.showBatchDownloadFormatMenu && (
              <div className="absolute bottom-full mb-1 left-0 w-40 bg-gray-900 border border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden py-1 text-sm">
                {(["mp3", "wav", "flac"] as AudioFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => { batchMenus.setBatchDownloadFormat(fmt); batchMenus.handleBatchDownload(fmt); }}
                    className={`w-full text-left px-3 py-2 transition-colors ${batchMenus.batchDownloadFormat === fmt ? "bg-gray-700 text-white" : "hover:bg-gray-800 text-gray-300"}`}
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
          {selection.selectedSongIds.size === 2 && (() => {
            const [idA, idB] = Array.from(selection.selectedSongIds);
            return (
              <button
                onClick={() => router.push(`/compare?a=${idA}&b=${idB}`)}
                aria-label="Compare selected songs"
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 transition-colors min-h-[44px]"
              >
                <ArrowsRightLeftIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Compare</span>
              </button>
            );
          })()}

          {selection.isArchiveView ? (
            <>
              <button
                onClick={() => selection.handleBatchAction("restore")}
                disabled={selection.batchLoading}
                aria-label="Restore selected songs"
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Restore</span>
              </button>
              <button
                onClick={() => selection.handleBatchAction("permanent_delete")}
                disabled={selection.batchLoading}
                aria-label="Permanently delete selected songs"
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                <TrashIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Delete forever</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => selection.handleBatchAction("delete")}
              disabled={selection.batchLoading}
              aria-label="Delete selected songs"
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors min-h-[44px]"
            >
              <TrashIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

          <button
            onClick={selection.clearSelection}
            aria-label="Clear selection"
            className="flex-shrink-0 ml-1 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors min-h-[44px]"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Delete / Permanent delete confirmation dialog */}
      {selection.showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div
            ref={selection.batchDeleteDialogRef}
            tabIndex={-1}
            className="bg-white dark:bg-gray-900 w-full sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 sm:mx-4 sm:max-w-sm"
          >
            <h3 id="delete-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              {selection.isArchiveView
                ? `Permanently delete ${selection.selectedSongIds.size} song${selection.selectedSongIds.size !== 1 ? "s" : ""}?`
                : `Delete ${selection.selectedSongIds.size} song${selection.selectedSongIds.size !== 1 ? "s" : ""}?`}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {selection.isArchiveView
                ? "This action cannot be undone. The selected songs will be permanently removed from your library."
                : "The selected songs will be moved to your archive. You can restore them later."}
            </p>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => selection.setShowDeleteConfirm(false)}
                disabled={selection.batchLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={() => selection.executeBatchAction(selection.isArchiveView ? "permanent_delete" : "delete")}
                disabled={selection.batchLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                {selection.batchLoading
                  ? (selection.isArchiveView ? "Deleting forever…" : "Archiving…")
                  : (selection.isArchiveView ? "Delete forever" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Per-song menu: permanent delete confirmation */}
      {selection.pendingMenuDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="menu-delete-dialog-title"
        >
          <div
            ref={selection.pendingDeleteDialogRef}
            tabIndex={-1}
            className="bg-white dark:bg-gray-900 w-full sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 sm:mx-4 sm:max-w-sm"
          >
            <h3 id="menu-delete-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Permanently delete &ldquo;{selection.pendingMenuDelete.song.title ?? "this song"}&rdquo;?
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              This action cannot be undone. The song will be permanently removed from your library.
            </p>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => selection.setPendingMenuDelete(null)}
                disabled={selection.menuDeleteLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={selection.executePendingMenuDelete}
                disabled={selection.menuDeleteLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                {selection.menuDeleteLoading ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

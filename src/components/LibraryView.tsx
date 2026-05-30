"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MusicalNoteIcon,
  ArrowUpOnSquareStackIcon,
  CheckIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { PlayIcon as PlayOutlineIcon } from "@heroicons/react/24/outline";
import type { Song } from "@prisma/client";
import { RecentlyPlayed } from "./RecentlyPlayed";
import { LowCreditsBanner } from "./LowCreditsBanner";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { formatBytes } from "@/lib/cache/offline";
import { LibraryToolbar } from "./LibraryToolbar";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Spinner } from "./Spinner";
import { useLibraryPullToRefresh } from "@/hooks/useLibraryPullToRefresh";
import { useLibraryFilterState } from "@/hooks/useLibraryFilterState";
import { useSongsList, type SongsFilters } from "@/hooks/useSongsList";
import { useTagsList } from "@/hooks/useTagsList";
import { useLibrarySongActions } from "@/hooks/useLibrarySongActions";
import { useLibraryBatchActions } from "@/hooks/useLibraryBatchActions";
import { useLibraryExport } from "@/hooks/useLibraryExport";
import { SongGridCard } from "./library/song-grid-card";
import { SwipableSongRow } from "./library/swipable-song-row";
import { LibraryBatchActionBar } from "./library/batch-action-bar";
import { LibraryDeleteDialogs } from "./library/delete-dialogs";
import { useLibrarySelection, useLibraryKeyboardNav } from "./library/hooks";

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
  const router = useRouter();

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

  // ─── Song state ──────────────────────────────────────────────────────────
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

  // ─── Offline cache ───────────────────────────────────────────────────────
  const { cachedIds, stats: offlineStats, saving: offlineSaving, saveOffline, removeOffline, clearAll: clearOffline } = useOfflineCache();
  const isOnline = useOnlineStatus();

  // ─── Selection state ─────────────────────────────────────────────────────
  const isArchiveView = smartFilter === "archived";
  const songIds = useMemo(() => songs.map((s) => s.id), [songs]);
  const { selectedSongIds, setSelectedSongIds, selectionMode, handleToggleSelect, handleSelectAll, clearSelection } = useLibrarySelection(songIds);

  // ─── Action hooks ────────────────────────────────────────────────────────
  const songActions = useLibrarySongActions(songs, setSongs);
  const batchActions = useLibraryBatchActions({
    songs,
    setSongs,
    selectedSongIds,
    clearSelection,
    isArchiveView,
  });
  const exportActions = useLibraryExport(songs);

  // ─── Tags ────────────────────────────────────────────────────────────────
  const tagsQuery = useTagsList();
  useEffect(() => {
    if (tagsQuery.data) setAvailableTags(tagsQuery.data);
  }, [tagsQuery.data]);

  // ─── Songs query ─────────────────────────────────────────────────────────
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

  // ─── Keyboard navigation ────────────────────────────────────────────────
  const { songListRef, handleSongListKeyDown } = useLibraryKeyboardNav({
    songs,
    onTogglePlay: songActions.handleTogglePlay,
    onToggleFavorite: songActions.handleToggleFavorite,
    onDeleteSong: (song) => {
      setSelectedSongIds(new Set([song.id]));
      batchActions.setShowDeleteConfirm(true);
    },
  });

  // ─── Virtualizer ────────────────────────────────────────────────────────
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

  const hasPlayableSongs = songs.some((s) => s.audioUrl && s.generationStatus === "ready");

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
              onClick={handleSelectAll}
              className="mt-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors"
            >
              {selectedSongIds.size === songs.length ? "Deselect all" : "Select all"}
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
        <div className="relative" ref={exportActions.exportMenuRef}>
          <button
            onClick={() => exportActions.setExportMenuOpen((o) => !o)}
            disabled={exportActions.exporting}
            aria-label="Export library"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              exportActions.exporting
                ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
            }`}
          >
            <ArrowUpOnSquareStackIcon className="w-4 h-4" />
            {exportActions.exporting && exportActions.exportProgress
              ? `${exportActions.exportProgress.completed}/${exportActions.exportProgress.total}`
              : "Export"}
          </button>

          {exportActions.exportMenuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg z-20 overflow-hidden">
              <button
                onClick={exportActions.handleExportZip}
                className="w-full text-left px-4 py-3 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Download as ZIP
              </button>
              <button
                onClick={exportActions.handleExportM3U}
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
      {exportActions.exporting && exportActions.exportProgress && (
        <div className="space-y-1">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.round((exportActions.exportProgress.completed / exportActions.exportProgress.total) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Downloading {exportActions.exportProgress.completed} of {exportActions.exportProgress.total} songs…
          </p>
        </div>
      )}

      {/* Play All button */}
      {hasPlayableSongs && !selectionMode && (
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
          {isArchiveView ? (
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
        <ul aria-label="Song library" className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 ${selectionMode ? "pb-20" : ""}`}>
          {songs.map((song, idx) => (
            <SongGridCard
              key={song.id}
              song={song}
              isActive={songActions.currentSongId === song.id}
              isPlaying={songActions.isPlaying}
              isSelected={selectedSongIds.has(song.id)}
              selectionMode={selectionMode}
              searchQuery={debouncedSearch}
              priority={idx < 4}
              onTogglePlay={songActions.handleTogglePlay}
              onToggleFavorite={songActions.handleToggleFavorite}
              onToggleSelect={(songId) => handleToggleSelect(songId, false)}
              onLongPress={(songId) => setSelectedSongIds(new Set([songId]))}
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
          className={selectionMode ? "pb-20" : ""}
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
                  isActive={songActions.currentSongId === song.id}
                  isPlaying={songActions.isPlaying}
                  currentTime={songActions.currentTime}
                  audioDuration={songActions.audioDuration}
                  rating={song.rating ? { stars: song.rating, note: song.ratingNote ?? "" } : undefined}
                  downloadProgress={songActions.downloadProgress[song.id] ?? null}
                  downloadError={songActions.downloadErrors[song.id] ?? null}
                  isSelected={selectedSongIds.has(song.id)}
                  selectionMode={selectionMode}
                  searchQuery={debouncedSearch}
                  isCached={cachedIds.has(song.id)}
                  isSaving={offlineSaving.has(song.id)}
                  isOnline={isOnline}
                  onTogglePlay={songActions.handleTogglePlay}
                  onDownload={songActions.handleDownload}
                  onSaveOffline={(s) => saveOffline({ id: s.id, title: s.title, imageUrl: s.imageUrl })}
                  onRemoveOffline={removeOffline}
                  onSeek={songActions.handleSeek}
                  onUpdate={songActions.handleSongUpdate}
                  onToggleFavorite={songActions.handleToggleFavorite}
                  onToggleSelect={handleToggleSelect}
                  onLongPress={(songId) => setSelectedSongIds(new Set([songId]))}
                  onRetry={songActions.handleRetry}
                  retryingId={songActions.retryingId}
                  isArchiveView={isArchiveView}
                  onSingleArchive={(s) => batchActions.handleSingleSongAction(s, "delete")}
                  onSingleRestore={(s) => batchActions.handleSingleSongAction(s, "restore")}
                  onSingleDeleteForever={(s) => batchActions.handleSingleSongAction(s, "permanent_delete")}
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
              <Spinner className="h-4 w-4" />
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
      {batchActions.batchDownloading && batchActions.batchDownloadProgress && (
        <div className="space-y-1">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.round((batchActions.batchDownloadProgress.completed / batchActions.batchDownloadProgress.total) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Downloading {batchActions.batchDownloadProgress.completed} of {batchActions.batchDownloadProgress.total} songs…
          </p>
        </div>
      )}

      {/* Floating action bar */}
      {selectionMode && (
        <LibraryBatchActionBar
          selectedSongIds={selectedSongIds}
          isArchiveView={isArchiveView}
          availableTags={availableTags}
          onCompare={(idA, idB) => router.push(`/compare?a=${idA}&b=${idB}`)}
          onClearSelection={clearSelection}
          batch={batchActions}
        />
      )}

      {/* Delete confirmation dialogs */}
      <LibraryDeleteDialogs
        showBatchDelete={batchActions.showDeleteConfirm}
        onCloseBatchDelete={() => batchActions.setShowDeleteConfirm(false)}
        selectedCount={selectedSongIds.size}
        isArchiveView={isArchiveView}
        batchLoading={batchActions.batchLoading}
        onConfirmBatchDelete={() => batchActions.executeBatchAction(isArchiveView ? "permanent_delete" : "delete")}
        pendingMenuDelete={batchActions.pendingMenuDelete}
        onCloseSingleDelete={() => batchActions.setPendingMenuDelete(null)}
        menuDeleteLoading={batchActions.menuDeleteLoading}
        onConfirmSingleDelete={batchActions.executePendingMenuDelete}
      />
    </div>
  );
}

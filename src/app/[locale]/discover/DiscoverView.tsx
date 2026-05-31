"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  QueueListIcon,
  RectangleStackIcon,
  SparklesIcon,
  MusicalNoteIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

import { SORT_OPTIONS, TEMPO_PRESETS } from "./discover-view.utils";
import {
  CollectionCard,
  DiscoverCard,
  FeedCard,
  PlaylistCard,
  SearchCard,
  TrendingRow,
} from "./discover-view.cards";
import {
  ActiveFilterChip,
  CollectionsGridSkeleton,
  EmptyState,
  FetchErrorBanner,
  FilterPill,
  PlaylistsGridSkeleton,
  ScrollSentinel,
  SongGridSkeleton,
  TABS,
  TrendingListSkeleton,
} from "./discover-view.components";
import type { DiscoverPagination, DiscoverSong, Tab } from "./discover-view.types";

import { useDiscoverFilters } from "@/hooks/useDiscoverFilters";
import { useDiscoverPlayback } from "@/hooks/useDiscoverPlayback";
import { useDiscoverBrowse } from "@/hooks/useDiscoverBrowse";
import { useDiscoverTrending } from "@/hooks/useDiscoverTrending";
import { useDiscoverFeed } from "@/hooks/useDiscoverFeed";
import { useDiscoverCollections } from "@/hooks/useDiscoverCollections";
import { useDiscoverPlaylists } from "@/hooks/useDiscoverPlaylists";
import { useDiscoverSearch } from "@/hooks/useDiscoverSearch";

export function DiscoverView({
  basePath = "/discover",
  initialSongs,
  initialPagination,
  defaultTab = "for_you",
}: {
  basePath?: string;
  initialSongs?: DiscoverSong[];
  initialPagination?: DiscoverPagination;
  defaultTab?: Tab;
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return (t === "trending" || t === "popular" || t === "browse" || t === "for_you" || t === "collections" || t === "playlists") ? t : defaultTab;
  });

  const { genreTags, moodTags, loadingFilters } = useDiscoverFilters();
  const { playingSongId, stopPlayback, handlePlayToggle } = useDiscoverPlayback();

  const browse = useDiscoverBrowse({
    active: tab === "browse",
    initialSongs,
    initialPagination,
    initialSortBy: searchParams.get("sortBy") || "newest",
    initialTag: searchParams.get("tag") || "",
    initialMood: searchParams.get("mood") || "",
    initialTempo: searchParams.get("tempo") || "",
  });

  const trending = useDiscoverTrending({
    active: tab === "trending" || tab === "popular",
    sort: tab === "popular" ? "popular" : "trending",
  });

  const feed = useDiscoverFeed({
    active: tab === "for_you",
    initialTag: searchParams.get("feedTag") || "",
    initialMood: searchParams.get("feedMood") || "",
  });

  const collectionsHook = useDiscoverCollections({ active: tab === "collections" });

  const playlistsHook = useDiscoverPlaylists({
    active: tab === "playlists",
    initialSort: "trending",
    initialGenre: "",
  });

  const search = useDiscoverSearch({
    initialQuery: searchParams.get("q") || "",
  });

  // Sync tab/filters/search to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search.query) {
      params.set("q", search.query);
    } else {
      if (tab !== "for_you") params.set("tab", tab);
      if (tab === "browse") {
        if (browse.sortBy !== "newest") params.set("sortBy", browse.sortBy);
        if (browse.tag) params.set("tag", browse.tag);
        if (browse.mood) params.set("mood", browse.mood);
        if (browse.tempoPreset) params.set("tempo", browse.tempoPreset);
      } else if (tab === "for_you") {
        if (feed.tag) params.set("feedTag", feed.tag);
        if (feed.mood) params.set("feedMood", feed.mood);
      } else if (tab === "playlists") {
        if (playlistsHook.sort !== "trending") params.set("plSort", playlistsHook.sort);
        if (playlistsHook.genre) params.set("plGenre", playlistsHook.genre);
      }
    }
    const qs = params.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  }, [tab, browse.sortBy, browse.tag, browse.mood, browse.tempoPreset, feed.tag, feed.mood, playlistsHook.sort, playlistsHook.genre, search.query, router, basePath]);

  const handleTabChange = useCallback(
    (newTab: Tab) => {
      stopPlayback();
      setTab(newTab);
    },
    [stopPlayback],
  );

  const totalCount =
    tab === "browse"
      ? browse.pagination.total
      : tab === "for_you"
      ? feed.pagination.total
      : trending.pagination.total;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/"
                className="text-violet-500 font-bold text-lg tracking-tight"
              >
                SunoFlow
              </Link>
              <h1 className="text-xl font-bold mt-1">Discover</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {tab === "for_you"
                  ? "Your personalized discover feed"
                  : tab === "collections"
                  ? "Themed song collections curated from the community"
                  : tab === "playlists"
                  ? "Browse published playlists from the community"
                  : `Explore ${totalCount} publicly shared songs`}
              </p>
            </div>
            <Link
              href="/auth/signin"
              className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline"
            >
              Sign in
            </Link>
          </div>

          {/* Search bar */}
          <div className="relative mt-3">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={search.inputValue}
              onChange={(e) => search.handleChange(e.target.value)}
              placeholder="Search songs, artists, genres..."
              className="w-full pl-9 pr-9 py-2 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-gray-400"
              aria-label="Search public songs"
            />
            {search.inputValue && (
              <button
                onClick={search.clear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Tab navigation — hidden during search */}
          {!search.query && (
            <div className="flex gap-1 mt-3">
              {TABS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleTabChange(value)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-[36px] ${
                    tab === value
                      ? "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Search results */}
        {search.query && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {search.loading
                  ? "Searching…"
                  : `${search.pagination.total} result${search.pagination.total !== 1 ? "s" : ""} for "${search.query}"`}
              </p>
            </div>
            {search.error ? (
              <FetchErrorBanner message={search.error.message} />
            ) : search.loading ? (
              <SongGridSkeleton />
            ) : search.results.length === 0 ? (
              <div className="text-center py-16">
                <MusicalNoteIcon className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No songs found. Try a different search.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {search.results.map((song) => (
                  <SearchCard
                    key={song.id}
                    song={song}
                    isPlaying={playingSongId === song.id}
                    onPlayToggle={() => handlePlayToggle(song.id, song.audioUrl)}
                  />
                ))}
              </div>
            )}
            {search.pagination.hasMore && (
              <ScrollSentinel ref={search.sentinelRef} loading={search.loadingMore} />
            )}
          </>
        )}

        {!search.query && tab === "for_you" && (
          <>
            {/* Feed genre/mood filters */}
            <div className="flex flex-col gap-4">
              <section>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Genre
                </p>
                <div className="flex flex-wrap gap-2">
                  <FilterPill
                    label="All Genres"
                    active={feed.tag === ""}
                    onClick={() => feed.setTag("")}
                  />
                  {loadingFilters
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-[44px] w-16 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse"
                        />
                      ))
                    : genreTags.map((g) => (
                        <FilterPill
                          key={g}
                          label={g}
                          active={feed.tag === g}
                          onClick={() => feed.setTag(feed.tag === g ? "" : g)}
                        />
                      ))}
                </div>
              </section>

              <section>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Mood
                </p>
                <div className="flex flex-wrap gap-2">
                  <FilterPill
                    label="Any Mood"
                    active={feed.mood === ""}
                    onClick={() => feed.setMood("")}
                  />
                  {loadingFilters
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-[44px] w-16 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse"
                        />
                      ))
                    : moodTags.map((m) => (
                        <FilterPill
                          key={m}
                          label={m}
                          active={feed.mood === m}
                          onClick={() => feed.setMood(feed.mood === m ? "" : m)}
                        />
                      ))}
                </div>
              </section>
            </div>

            {/* Feed song grid */}
            {feed.error ? (
              <FetchErrorBanner message={feed.error.message} />
            ) : feed.loading ? (
              <SongGridSkeleton />
            ) : feed.songs.length === 0 ? (
              <div className="text-center py-16">
                <SparklesIcon className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No songs to show yet. Try a different filter or check back later.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {feed.songs.map((song) => (
                  <FeedCard
                    key={song.id}
                    song={song}
                    isPlaying={playingSongId === song.id}
                    onPlayToggle={() => handlePlayToggle(song.id, song.audioUrl)}
                    onTagClick={(t) => feed.setTag(t)}
                    onMoodClick={(m) => feed.setMood(m)}
                  />
                ))}
              </div>
            )}

            {feed.pagination.hasMore && (
              <ScrollSentinel ref={feed.sentinelRef} loading={feed.loadingMore} />
            )}
          </>
        )}

        {!search.query && tab === "browse" && (
          <>
            {/* Sort + clear */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-2">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Sort:
                </span>
                <div className="flex gap-1">
                  {SORT_OPTIONS.map((opt) => (
                    <FilterPill
                      key={opt.value}
                      label={opt.label}
                      active={browse.sortBy === opt.value}
                      onClick={() => browse.setSortBy(opt.value)}
                    />
                  ))}
                </div>
              </div>
              {browse.filterCount > 0 && (
                <button
                  onClick={browse.clearFilters}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:underline shrink-0"
                >
                  Clear {browse.filterCount} filter{browse.filterCount > 1 ? "s" : ""}
                </button>
              )}
            </div>

            {/* Active filter chips */}
            {browse.filterCount > 0 && (
              <div className="flex flex-wrap gap-2" aria-label="Active filters">
                {browse.tag && (
                  <ActiveFilterChip
                    label={`Genre: ${browse.tag}`}
                    onRemove={() => browse.setTag("")}
                  />
                )}
                {browse.mood && (
                  <ActiveFilterChip
                    label={`Mood: ${browse.mood}`}
                    onRemove={() => browse.setMood("")}
                  />
                )}
                {browse.tempoPreset && (
                  <ActiveFilterChip
                    label={`Tempo: ${browse.tempoPreset}`}
                    onRemove={() => browse.setTempoPreset("")}
                  />
                )}
              </div>
            )}

            {/* Genre filter */}
            <section>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Genre
              </p>
              <div className="flex flex-wrap gap-2">
                <FilterPill
                  label="All Genres"
                  active={browse.tag === ""}
                  onClick={() => browse.setTag("")}
                />
                {loadingFilters
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[44px] w-16 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse"
                      />
                    ))
                  : genreTags.map((g) => (
                      <FilterPill
                        key={g}
                        label={g}
                        active={browse.tag === g}
                        onClick={() => browse.setTag(browse.tag === g ? "" : g)}
                      />
                    ))}
              </div>
            </section>

            {/* Mood filter */}
            <section>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Mood
              </p>
              <div className="flex flex-wrap gap-2">
                <FilterPill
                  label="Any Mood"
                  active={browse.mood === ""}
                  onClick={() => browse.setMood("")}
                />
                {loadingFilters
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[44px] w-16 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse"
                      />
                    ))
                  : moodTags.map((m) => (
                      <FilterPill
                        key={m}
                        label={m}
                        active={browse.mood === m}
                        onClick={() => browse.setMood(browse.mood === m ? "" : m)}
                      />
                    ))}
              </div>
            </section>

            {/* Tempo filter */}
            <section>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Tempo
              </p>
              <div className="flex flex-wrap gap-2">
                <FilterPill
                  label="Any Tempo"
                  active={browse.tempoPreset === ""}
                  onClick={() => browse.setTempoPreset("")}
                />
                {TEMPO_PRESETS.map((preset) => (
                  <FilterPill
                    key={preset.label}
                    label={`${preset.label} (${
                      preset.label === "Slow"
                        ? "≤80 BPM"
                        : preset.label === "Medium"
                        ? "81–120 BPM"
                        : "121+ BPM"
                    })`}
                    active={browse.tempoPreset === preset.label}
                    onClick={() =>
                      browse.setTempoPreset(browse.tempoPreset === preset.label ? "" : preset.label)
                    }
                  />
                ))}
              </div>
            </section>

            {/* Browse song grid */}
            {browse.error ? (
              <FetchErrorBanner message={browse.error.message} />
            ) : browse.loading ? (
              <SongGridSkeleton />
            ) : browse.songs.length === 0 ? (
              <EmptyState
                hasFilters={browse.filterCount > 0}
                onClear={browse.clearFilters}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {browse.songs.map((song) => (
                  <DiscoverCard
                    key={song.id}
                    song={song}
                    isPlaying={playingSongId === song.id}
                    onPlayToggle={() =>
                      handlePlayToggle(song.id, song.audioUrl)
                    }
                    onTagClick={(t) => browse.setTag(t)}
                    onMoodClick={(m) => browse.setMood(m)}
                  />
                ))}
              </div>
            )}

            {/* Infinite scroll sentinel */}
            {browse.pagination.hasMore && (
              <ScrollSentinel ref={browse.sentinelRef} loading={browse.loadingMore} />
            )}
          </>
        )}

        {!search.query && (tab === "trending" || tab === "popular") && (
          <>
            {/* Tab description */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {tab === "trending"
                  ? "Songs gaining momentum over the last 30 days, ranked by plays and recency."
                  : "All-time most-played public songs."}
              </p>
              {trending.filterCount > 0 && (
                <button
                  onClick={trending.clearFilters}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:underline shrink-0"
                >
                  Clear {trending.filterCount} filter{trending.filterCount > 1 ? "s" : ""}
                </button>
              )}
            </div>

            {/* Active filter chips for trending/popular */}
            {trending.filterCount > 0 && (
              <div className="flex flex-wrap gap-2" aria-label="Active filters">
                {trending.genre && (
                  <ActiveFilterChip
                    label={`Genre: ${trending.genre}`}
                    onRemove={() => trending.setGenre("")}
                  />
                )}
                {trending.mood && (
                  <ActiveFilterChip
                    label={`Mood: ${trending.mood}`}
                    onRemove={() => trending.setMood("")}
                  />
                )}
              </div>
            )}

            {/* Genre filter for trending/popular */}
            <section>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Genre
              </p>
              <div className="flex flex-wrap gap-2">
                <FilterPill
                  label="All Genres"
                  active={trending.genre === ""}
                  onClick={() => trending.setGenre("")}
                />
                {loadingFilters
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[44px] w-16 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse"
                      />
                    ))
                  : genreTags.map((g) => (
                      <FilterPill
                        key={g}
                        label={g}
                        active={trending.genre === g}
                        onClick={() =>
                          trending.setGenre(trending.genre === g ? "" : g)
                        }
                      />
                    ))}
              </div>
            </section>

            {/* Mood filter for trending/popular */}
            <section>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Mood
              </p>
              <div className="flex flex-wrap gap-2">
                <FilterPill
                  label="Any Mood"
                  active={trending.mood === ""}
                  onClick={() => trending.setMood("")}
                />
                {loadingFilters
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[44px] w-16 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse"
                      />
                    ))
                  : moodTags.map((m) => (
                      <FilterPill
                        key={m}
                        label={m}
                        active={trending.mood === m}
                        onClick={() =>
                          trending.setMood(trending.mood === m ? "" : m)
                        }
                      />
                    ))}
              </div>
            </section>

            {/* Trending song list */}
            {trending.error ? (
              <FetchErrorBanner message={trending.error.message} />
            ) : trending.loading ? (
              <TrendingListSkeleton />
            ) : trending.songs.length === 0 ? (
              <EmptyState
                hasFilters={trending.filterCount > 0}
                onClear={trending.clearFilters}
              />
            ) : (
              <div className="space-y-2">
                {trending.songs.map((song, index) => (
                  <TrendingRow
                    key={song.id}
                    song={song}
                    rank={trending.pagination.offset + index + 1}
                    isPlaying={playingSongId === song.id}
                    onPlayToggle={() =>
                      handlePlayToggle(song.id, song.audioUrl)
                    }
                    isTrending={tab === "trending"}
                  />
                ))}
              </div>
            )}

            {/* Infinite scroll sentinel for trending */}
            {trending.pagination.hasMore && (
              <ScrollSentinel ref={trending.sentinelRef} loading={trending.loadingMore} />
            )}
          </>
        )}

        {!search.query && tab === "collections" && (
          <>
            {collectionsHook.error ? (
              <FetchErrorBanner message={collectionsHook.error.message} />
            ) : collectionsHook.loading ? (
              <CollectionsGridSkeleton />
            ) : collectionsHook.collections.length === 0 ? (
              <div className="text-center py-16">
                <RectangleStackIcon className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No collections available yet. Check back soon.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {collectionsHook.collections.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </div>
            )}
          </>
        )}

        {!search.query && tab === "playlists" && (
          <>
            {/* Sort + genre filter */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Sort:
                </span>
                <div className="flex gap-1">
                  {([
                    { value: "trending", label: "Trending" },
                    { value: "recent", label: "Recent" },
                    { value: "popular", label: "Most Played" },
                  ] as const).map((opt) => (
                    <FilterPill
                      key={opt.value}
                      label={opt.label}
                      active={playlistsHook.sort === opt.value}
                      onClick={() => playlistsHook.setSort(opt.value)}
                    />
                  ))}
                </div>
              </div>
              {playlistsHook.genre && (
                <button
                  onClick={() => playlistsHook.setGenre("")}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:underline shrink-0"
                >
                  Clear filter
                </button>
              )}
            </div>

            {/* Active genre chip */}
            {playlistsHook.genre && (
              <div className="flex flex-wrap gap-2" aria-label="Active filters">
                <ActiveFilterChip
                  label={`Genre: ${playlistsHook.genre}`}
                  onRemove={() => playlistsHook.setGenre("")}
                />
              </div>
            )}

            {/* Genre filter chips */}
            <section>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Genre
              </p>
              <div className="flex flex-wrap gap-2">
                <FilterPill
                  label="All Genres"
                  active={playlistsHook.genre === ""}
                  onClick={() => playlistsHook.setGenre("")}
                />
                {loadingFilters
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[44px] w-16 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse"
                      />
                    ))
                  : genreTags.map((g) => (
                      <FilterPill
                        key={g}
                        label={g}
                        active={playlistsHook.genre === g}
                        onClick={() => playlistsHook.setGenre(playlistsHook.genre === g ? "" : g)}
                      />
                    ))}
              </div>
            </section>

            {/* Playlists grid */}
            {playlistsHook.error ? (
              <FetchErrorBanner message={playlistsHook.error.message} />
            ) : playlistsHook.loading ? (
              <PlaylistsGridSkeleton />
            ) : playlistsHook.playlists.length === 0 ? (
              <div className="text-center py-16">
                <QueueListIcon className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No published playlists yet.
                </p>
                {playlistsHook.genre && (
                  <button
                    onClick={() => playlistsHook.setGenre("")}
                    className="mt-3 text-sm text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {playlistsHook.playlists.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            )}

            {playlistsHook.pagination.hasMore && (
              <ScrollSentinel ref={playlistsHook.sentinelRef} loading={playlistsHook.loadingMore} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

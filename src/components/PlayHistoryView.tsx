"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MusicalNoteIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import { useQueue, type QueueSong } from "./QueueContext";
import { useToast } from "./Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistorySong {
  id: string;
  title: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  duration: number | null;
  lyrics: string | null;
  generationStatus: string;
  archivedAt: Date | string | null;
}

interface HistoryItem {
  id: string;
  songId: string;
  playedAt: string;
  song: HistorySong;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlayHistoryView() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [clearing, setClearing] = useState(false);
  const loadedRef = useRef(false);

  const { queue, currentIndex, isPlaying, togglePlay } = useQueue();
  const { toast } = useToast();
  const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;

  const fetchHistory = useCallback(async (cursor?: string) => {
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/history?${params}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return await res.json() as { items: HistoryItem[]; nextCursor: string | null; total: number };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    fetchHistory().then((data) => {
      if (data) {
        setItems(data.items);
        setNextCursor(data.nextCursor);
        setTotal(data.total);
      }
      setLoading(false);
    });
  }, [fetchHistory]);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchHistory(nextCursor);
    if (data) {
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
      setTotal(data.total);
    }
    setLoadingMore(false);
  }, [nextCursor, loadingMore, fetchHistory]);

  const handleClearHistory = useCallback(async () => {
    if (clearing) return;
    setClearing(true);
    try {
      const res = await fetch("/api/history", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems([]);
      setNextCursor(null);
      setTotal(0);
      toast("Play history cleared.", "success");
    } catch {
      toast("Failed to clear history.", "error");
    } finally {
      setClearing(false);
    }
  }, [clearing, toast]);

  function toQueueSong(song: HistorySong): QueueSong {
    return {
      id: song.id,
      title: song.title,
      audioUrl: song.audioUrl ?? "",
      imageUrl: song.imageUrl,
      duration: song.duration,
      lyrics: song.lyrics,
    };
  }

  function handlePlaySong(item: HistoryItem) {
    if (!item.song.audioUrl) return;
    togglePlay(toQueueSong(item.song));
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClockIcon className="w-6 h-6 text-violet-500" />
            Recently Played
          </h1>
          {!loading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {total === 0 ? "No play history yet" : `${total} track${total === 1 ? "" : "s"} played`}
            </p>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={handleClearHistory}
            disabled={clearing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <TrashIcon className="w-4 h-4" />
            {clearing ? "Clearing…" : "Clear history"}
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <ul className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <li
              key={i}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl h-16 animate-pulse"
            />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClockIcon className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No play history yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Songs you listen to will appear here.
          </p>
          <Link
            href="/library"
            className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Go to Library
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((item) => {
              const song = item.song;
              const isCurrent = currentSong?.id === song.id;
              const isPlayable = !!song.audioUrl && song.generationStatus === "ready";

              return (
                <li
                  key={item.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    {/* Cover art */}
                    <div className="relative flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                      {song.imageUrl ? (
                        <Image
                          src={song.imageUrl}
                          alt={song.title ?? "Song"}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <MusicalNoteIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    {/* Title + timestamp */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/library/${song.id}`}
                        className="text-sm font-medium text-gray-900 dark:text-white truncate block hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                      >
                        {song.title ?? "Untitled"}
                      </Link>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {formatDate(item.playedAt)}
                      </p>
                    </div>

                    {/* Play button */}
                    {isPlayable && (
                      <button
                        onClick={() => handlePlaySong(item)}
                        aria-label={isCurrent && isPlaying ? "Pause" : `Play ${song.title ?? "song"}`}
                        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                          isCurrent
                            ? "bg-violet-600 hover:bg-violet-500 text-white"
                            : "bg-gray-100 dark:bg-gray-800 hover:bg-violet-100 dark:hover:bg-violet-900/40 text-gray-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400"
                        }`}
                      >
                        {isCurrent && isPlaying ? (
                          <PauseIcon className="w-4 h-4" />
                        ) : (
                          <PlayIcon className="w-4 h-4 ml-0.5" />
                        )}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {nextCursor && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full py-2.5 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800 transition-colors disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

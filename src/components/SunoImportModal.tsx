"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
  MusicalNoteIcon,
  CloudArrowDownIcon,
} from "@heroicons/react/24/solid";
import { Skeleton } from "./Skeleton";
import { useNotifications } from "./NotificationContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RemoteSong {
  id: string;
  title: string;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  tags: string | null;
  createdAt: string;
  status: string;
  alreadyImported: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

interface ImportResult {
  imported: Array<{ sunoId: string; localId: string }>;
  skipped: Array<{ sunoId: string; reason: string }>;
  errors: Array<{ id: string; error: string }>;
}

interface SunoImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (!seconds || isNaN(seconds)) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SongCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
        <Skeleton className="h-3 w-1/3 rounded" />
      </div>
    </div>
  );
}

// ─── Song card ────────────────────────────────────────────────────────────────

interface SongCardProps {
  song: RemoteSong;
  selected: boolean;
  onToggle: (id: string) => void;
}

function SongCard({ song, selected, onToggle }: SongCardProps) {
  const isSelectable = !song.alreadyImported;

  return (
    <div
      role={isSelectable ? "checkbox" : undefined}
      aria-checked={isSelectable ? selected : undefined}
      aria-label={isSelectable ? `Select ${song.title || "Untitled"}` : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      onClick={() => isSelectable && onToggle(song.id)}
      onKeyDown={(e) => {
        if (isSelectable && (e.key === " " || e.key === "Enter")) {
          e.preventDefault();
          onToggle(song.id);
        }
      }}
      className={`relative bg-white dark:bg-gray-900 border rounded-xl overflow-hidden transition-all ${
        isSelectable
          ? "cursor-pointer hover:shadow-md hover:border-violet-400 dark:hover:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          : "opacity-70 cursor-default"
      } ${
        selected
          ? "border-violet-500 ring-2 ring-violet-400 dark:ring-violet-500"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      {/* Cover art */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
        {song.imageUrl ? (
          <Image
            src={song.imageUrl}
            alt={song.title || "Song cover"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <MusicalNoteIcon className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {/* Selection overlay */}
        {isSelectable && selected && (
          <div className="absolute inset-0 bg-violet-600/20 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shadow-lg">
              <CheckIcon className="w-5 h-5 text-white" />
            </div>
          </div>
        )}

        {/* Duration badge */}
        {song.duration && (
          <span className="absolute bottom-1.5 right-1.5 text-xs text-white bg-black/60 rounded px-1 py-0.5 leading-none">
            {formatDuration(song.duration)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate leading-snug">
          {song.title || "Untitled"}
        </p>
        {song.tags && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{song.tags}</p>
        )}
        {song.alreadyImported && (
          <span className="inline-block text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-full px-2 py-0.5 leading-none">
            In library
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SunoImportModal({ onClose, onImportComplete }: SunoImportModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotifications();

  const [songs, setSongs] = useState<RemoteSong[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<{ type: "no_key" | "suno" | "network"; message?: string } | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // ── Fetch songs ────────────────────────────────────────────────────────────

  const fetchSongs = useCallback(async (page: number) => {
    const isFirst = page === 1;
    if (isFirst) setLoadingInitial(true);
    else setLoadingMore(true);
    setFetchError(null);

    try {
      const res = await fetch(`/api/suno/songs?page=${page}&limit=20`);
      if (res.status === 400) {
        setFetchError({ type: "no_key" });
        return;
      }
      if (res.status === 401) {
        setFetchError({ type: "suno", message: "Invalid Suno API key. Please check your settings." });
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFetchError({ type: "suno", message: (data as { error?: string }).error ?? "Failed to load songs from Suno." });
        return;
      }
      const data = (await res.json()) as { songs: RemoteSong[]; pagination: Pagination };
      setSongs((prev) => (isFirst ? data.songs : [...prev, ...data.songs]));
      setPagination(data.pagination);
    } catch {
      setFetchError({ type: "network", message: "Network error. Please check your connection and try again." });
    } finally {
      if (isFirst) setLoadingInitial(false);
      else setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchSongs(1);
  }, [fetchSongs]);

  // ── Keyboard handling ─────────────────────────────────────────────────────

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const el = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])'
    );
    el?.focus();
  }, []);

  // ── Selection helpers ──────────────────────────────────────────────────────

  const selectableSongs = songs.filter((s) => !s.alreadyImported);

  function toggleSong(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    if (selectedIds.size === selectableSongs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableSongs.map((s) => s.id)));
    }
  }

  // ── Import ─────────────────────────────────────────────────────────────────

  async function handleImport() {
    if (selectedIds.size === 0 || importing) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/suno/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songIds: Array.from(selectedIds) }),
      });
      const data = (await res.json()) as ImportResult;
      setImportResult(data);

      // Mark newly imported songs as alreadyImported in the list
      const importedIds = new Set(data.imported.map((r) => r.sunoId));
      setSongs((prev) =>
        prev.map((s) => (importedIds.has(s.id) ? { ...s, alreadyImported: true } : s))
      );
      setSelectedIds(new Set());

      if (data.imported.length > 0) {
        addNotification({
          type: "import_complete",
          title: "Import complete",
          message: `Imported ${data.imported.length} song${data.imported.length !== 1 ? "s" : ""} successfully`,
          href: "/library",
        });
        onImportComplete();
      }
    } catch {
      setImportResult({ imported: [], skipped: [], errors: [{ id: "request", error: "Network error. Please try again." }] });
    } finally {
      setImporting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const nextPage = pagination ? pagination.page + 1 : 1;
  const hasMore = pagination?.hasMore ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Import from Suno"
        className="w-full sm:max-w-2xl bg-white dark:bg-gray-950 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Import from Suno</h2>
            {pagination && !loadingInitial && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {pagination.total} song{pagination.total !== 1 ? "s" : ""} in your Suno account
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          {/* Loading skeleton */}
          {loadingInitial && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SongCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error: no API key */}
          {!loadingInitial && fetchError?.type === "no_key" && (
            <div className="text-center py-12 space-y-3">
              <MusicalNoteIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="text-gray-900 dark:text-white font-medium">No Suno API key configured</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add your API key in{" "}
                <Link
                  href="/settings#suno-api-key"
                  className="text-violet-600 dark:text-violet-400 underline hover:text-violet-500"
                  onClick={onClose}
                >
                  Settings → Account
                </Link>{" "}
                to connect your Suno account.
              </p>
            </div>
          )}

          {/* Error: Suno API or network */}
          {!loadingInitial && fetchError && fetchError.type !== "no_key" && (
            <div className="text-center py-12 space-y-3">
              <ArrowPathIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="text-gray-900 dark:text-white font-medium">
                {fetchError.message ?? "Failed to load songs"}
              </p>
              <button
                onClick={() => fetchSongs(1)}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loadingInitial && !fetchError && songs.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <MusicalNoteIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="text-gray-900 dark:text-white font-medium">No songs found in your Suno account</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Generate songs on suno.com and they&apos;ll appear here.
              </p>
            </div>
          )}

          {/* Song grid */}
          {!loadingInitial && !fetchError && songs.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {songs.map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    selected={selectedIds.has(song.id)}
                    onToggle={toggleSong}
                  />
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => fetchSongs(nextPage)}
                    disabled={loadingMore}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        Loading…
                      </span>
                    ) : (
                      "Load more"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loadingInitial && !fetchError && songs.length > 0 && (
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 px-4 py-3 space-y-3">
            {/* Import result */}
            {importResult && (
              <div className="text-sm rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-0.5">
                {importResult.imported.length > 0 && (
                  <p className="text-green-700 dark:text-green-400">
                    ✓ Imported {importResult.imported.length} song{importResult.imported.length !== 1 ? "s" : ""}
                  </p>
                )}
                {importResult.skipped.length > 0 && (
                  <p className="text-gray-500 dark:text-gray-400">
                    Skipped {importResult.skipped.length} (already in library)
                  </p>
                )}
                {importResult.errors.length > 0 && (
                  <p className="text-red-600 dark:text-red-400">
                    {importResult.errors.length} error{importResult.errors.length !== 1 ? "s" : ""} —{" "}
                    {importResult.errors[0].error}
                  </p>
                )}
              </div>
            )}

            {/* Controls row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {selectableSongs.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors"
                  >
                    {selectedIds.size === selectableSongs.length ? "Deselect all" : "Select all"}
                  </button>
                )}
                {selectedIds.size > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedIds.size} selected
                  </span>
                )}
              </div>

              <button
                onClick={handleImport}
                disabled={selectedIds.size === 0 || importing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-500 text-white"
              >
                {importing ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <CloudArrowDownIcon className="w-4 h-4" />
                    {selectedIds.size > 0
                      ? `Import selected (${selectedIds.size})`
                      : "Import selected"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

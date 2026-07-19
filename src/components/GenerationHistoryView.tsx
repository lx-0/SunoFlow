"use client";

import { useState, useEffect } from "react";
import { apiGet, apiDelete } from "@/lib/api-client";
import { StatusBadge } from "./StatusBadge";
import Link from "next/link";
import {
  Music,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronsUpDown,
  Play,
  Pause,
  Search,
  Bookmark,
  X,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "./Toast";
import { useQueue, type QueueSong } from "./QueueContext";
import Image from "next/image";
import { formatDuration as formatTime } from "@/lib/time-format";
import { type HistorySortKey } from "./history/filter-url-state";
import {
  formatHistoryRelativeDate,
  HISTORY_SORT_OPTIONS,
  HISTORY_STATUS_FILTERS,
  type HistoryStatusFilter,
} from "./history/view-config";
import { useHistoryFilters } from "@/hooks/useHistoryFilters";
import { useHistoryRetry } from "@/hooks/useHistoryRetry";
import { useHistoryPendingPoll } from "@/hooks/useHistoryPendingPoll";
import { useHistorySavedPrompts } from "@/hooks/useHistorySavedPrompts";

import { Spinner } from "./Spinner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GenerationEntry {
  id: string;
  title: string | null;
  prompt: string | null;
  tags: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  generationStatus: string;
  errorMessage: string | null;
  isInstrumental: boolean;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Build generate URL from song params ──────────────────────────────────────

function buildGenerateUrl(entry: GenerationEntry): string {
  const params = new URLSearchParams();
  if (entry.prompt) params.set("prompt", entry.prompt);
  if (entry.title) params.set("title", entry.title);
  if (entry.tags) params.set("tags", entry.tags);
  return `/generate?${params.toString()}`;
}

// ─── Row component ────────────────────────────────────────────────────────────

function GenerationRow({
  entry,
  onRetry,
  retryingId,
  onSavePrompt,
  savingPromptId,
}: {
  entry: GenerationEntry;
  onRetry: (entry: GenerationEntry) => void;
  retryingId: string | null;
  onSavePrompt: (entry: GenerationEntry) => void;
  savingPromptId: string | null;
}) {
  const isReady = entry.generationStatus === "ready";
  const isFailed = entry.generationStatus === "failed";
  const isRetrying = retryingId === entry.id;
  const isSaving = savingPromptId === entry.id;
  const { togglePlay, queue, currentIndex, isPlaying } = useQueue();

  const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;
  const isThisSongPlaying = isPlaying && currentSong?.id === entry.id;

  const queueSong: QueueSong = {
    id: entry.id,
    title: entry.title,
    audioUrl: entry.audioUrl ?? "",
    imageUrl: entry.imageUrl,
    duration: entry.duration,
    lyrics: null,
  };

  return (
    <li className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="flex items-start gap-3 px-3 py-3">
        {/* Cover art with play overlay */}
        <div className="relative flex-shrink-0 w-12 h-12 rounded-lg bg-surface-raised overflow-hidden flex items-center justify-center group">
          {entry.imageUrl ? (
            <Image src={entry.imageUrl} alt={entry.title ?? "Song"} fill className="object-cover" sizes="48px" loading="lazy" />
          ) : (
            <Icon icon={Music} className="w-6 h-6 text-muted" />
          )}
          {isReady && entry.audioUrl && (
            <button
              onClick={() => togglePlay(queueSong)}
              aria-label={isThisSongPlaying ? "Pause" : "Play"}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {isThisSongPlaying ? (
                <Icon icon={Pause} className="w-5 h-5 text-white" />
              ) : (
                <Icon icon={Play} className="w-5 h-5 text-white" />
              )}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isReady ? (
              <Link
                href={`/library/${entry.id}`}
                className="text-sm font-medium text-primary truncate hover:text-violet-400 transition-colors"
              >
                {entry.title ?? "Untitled"}
              </Link>
            ) : (
              <span className="text-sm font-medium text-primary truncate">
                {entry.title ?? "Untitled"}
              </span>
            )}
            <StatusBadge status={entry.generationStatus} error={entry.errorMessage} />
            {entry.isInstrumental && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-xs font-medium">
                Instrumental
              </span>
            )}
            {entry.source === "auto" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                Auto
              </span>
            )}
          </div>

          {entry.prompt && (
            <p className="text-xs text-secondary line-clamp-2">{entry.prompt}</p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {entry.tags && <span className="text-xs text-muted">{entry.tags}</span>}
            {entry.duration != null && (
              <span className="text-xs text-muted">{formatTime(entry.duration)}</span>
            )}
            <span className="text-xs text-muted flex items-center gap-1">
              <Icon icon={Clock} className="w-3 h-3" />
              {formatHistoryRelativeDate(entry.createdAt)}
            </span>
          </div>

          {isFailed && entry.errorMessage && (
            <p className="text-xs text-red-400 mt-1">{entry.errorMessage}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {/* Save prompt */}
          {entry.prompt && (
            <button
              onClick={() => onSavePrompt(entry)}
              disabled={isSaving}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-raised hover:bg-amber-100 dark:hover:bg-amber-900/40 text-secondary hover:text-amber-600 dark:hover:text-amber-400 transition-colors disabled:opacity-50"
              title="Save prompt for reuse"
              aria-label="Save prompt"
            >
              {isSaving ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Icon icon={Bookmark} className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Retry — only for failed */}
          {isFailed && (
            <button
              onClick={() => onRetry(entry)}
              disabled={isRetrying}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
              title="Retry with same parameters"
              aria-label="Retry"
            >
              {isRetrying ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Icon icon={RefreshCw} className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Regenerate — for all songs (navigate to generate with same params) */}
          <Link
            href={buildGenerateUrl(entry)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-raised hover:bg-surface-hover text-primary transition-colors"
            title={isFailed ? "Create new generation with same prompt" : "Regenerate with same prompt"}
            aria-label="Regenerate"
          >
            <Icon icon={Sparkles} className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </li>
  );
}

// ─── Saved Prompts section ────────────────────────────────────────────────────

interface Preset {
  id: string;
  name: string;
  stylePrompt: string | null;
  lyricsPrompt: string | null;
  isInstrumental: boolean;
  createdAt: string;
}

function SavedPromptsPanel() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    apiGet<{ presets?: Preset[] }>("/api/presets")
      .then((d) => setPresets(d.presets ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await apiDelete(`/api/presets/${id}`);
      setPresets((prev) => prev.filter((p) => p.id !== id));
      toast("Prompt deleted", "success");
    } catch {
      toast("Failed to delete prompt", "error");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner className="h-5 w-5 text-violet-500" />
      </div>
    );
  }

  if (presets.length === 0) {
    return (
      <p className="text-sm text-secondary text-center py-4">
        No saved prompts yet. Click the <Icon icon={Bookmark} className="w-3.5 h-3.5 inline" /> button on any generation to save it.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {presets.map((preset) => (
        <li
          key={preset.id}
          className="flex items-center gap-3 bg-surface border border-border rounded-xl px-3 py-2.5"
        >
          <Icon icon={Bookmark} fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary truncate">{preset.name}</p>
            {preset.stylePrompt && (
              <p className="text-xs text-secondary truncate">{preset.stylePrompt}</p>
            )}
          </div>
          <Link
            href={`/generate?prompt=${encodeURIComponent(preset.stylePrompt ?? "")}&title=${encodeURIComponent(preset.name)}`}
            className="flex-shrink-0 px-2.5 py-1 text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-full transition-colors"
          >
            Use
          </Link>
          <button
            onClick={() => handleDelete(preset.id)}
            disabled={deletingId === preset.id}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/40 text-secondary hover:text-red-500 transition-colors disabled:opacity-50"
            aria-label="Delete saved prompt"
          >
            <Icon icon={X} className="w-4 h-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

interface GenerationHistoryViewProps {
  songs: GenerationEntry[];
  initialNextCursor?: string | null;
  initialTotal?: number;
}

export function GenerationHistoryView({
  songs: initialSongs,
  initialNextCursor = null,
  initialTotal,
}: GenerationHistoryViewProps) {
  const {
    songs,
    setSongs,
    nextCursor,
    totalSongs,
    loading,
    loadingMore,
    activeFilter,
    sortKey,
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    handleFilterChange,
    handleSortChange,
    handleDateChange,
    handleLoadMore,
  } = useHistoryFilters({ initialSongs, initialNextCursor, initialTotal });

  const { retryingId, handleRetry, mergeSongUpdate } = useHistoryRetry(setSongs);
  useHistoryPendingPoll(songs, mergeSongUpdate);
  const { savingPromptId, handleSavePrompt } = useHistorySavedPrompts();
  const [showSavedPrompts, setShowSavedPrompts] = useState(false);

  const remaining = totalSongs - songs.length;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">Generation History</h1>
          <p className="text-secondary text-sm mt-0.5">
            {loading ? "Loading…" : `${songs.length}${remaining > 0 ? ` of ${totalSongs}` : ""} generation${totalSongs !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setShowSavedPrompts((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px] ${
            showSavedPrompts
              ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
              : "bg-surface-raised text-secondary hover:text-primary"
          }`}
        >
          <Icon icon={Bookmark} fill="currentColor" className="w-4 h-4" />
          Saved Prompts
        </button>
      </div>

      {/* Saved prompts panel */}
      {showSavedPrompts && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 space-y-2">
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Saved Prompts</h2>
          <SavedPromptsPanel />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Icon icon={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by prompt…"
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface border border-border text-sm text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* Date range */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs text-secondary mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); handleDateChange(); }}
            className="w-full px-3 py-1.5 rounded-xl bg-surface border border-border text-sm text-primary focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-secondary mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); handleDateChange(); }}
            className="w-full px-3 py-1.5 rounded-xl bg-surface border border-border text-sm text-primary focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        {(dateFrom || dateTo) && (
          <div className="flex items-end pb-0.5">
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); handleDateChange(); }}
              className="px-3 py-1.5 rounded-xl text-xs text-muted hover:text-primary bg-surface-raised transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Status chips + sort */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
          {HISTORY_STATUS_FILTERS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleFilterChange(opt.value)}
              disabled={loading}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[44px] disabled:opacity-50 ${
                activeFilter === opt.value
                  ? "bg-violet-600 text-white"
                  : "bg-surface-raised text-secondary hover:text-primary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="relative flex-shrink-0">
          <select
            value={sortKey}
            onChange={(e) => handleSortChange(e.target.value as HistorySortKey)}
            disabled={loading}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-full text-sm font-medium bg-surface-raised text-primary border-none cursor-pointer min-h-[44px] focus:ring-2 focus:ring-violet-500 focus:outline-none disabled:opacity-50"
            aria-label="Sort generations"
          >
            {HISTORY_SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Icon icon={ChevronsUpDown} className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-6 w-6 text-violet-500" />
        </div>
      ) : songs.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center space-y-3">
          <Icon icon={Music} className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto" />
          <p className="text-muted text-sm">
            {activeFilter !== "all" || debouncedQuery || dateFrom || dateTo
              ? "No generations match these filters."
              : "No generation history yet. Create your first song!"}
          </p>
          {activeFilter === "all" && !debouncedQuery && !dateFrom && !dateTo && (
            <Link href="/generate" className="inline-flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors">
              Go to Generate
            </Link>
          )}
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {songs.map((entry) => (
              <GenerationRow
                key={entry.id}
                entry={entry}
                onRetry={handleRetry}
                retryingId={retryingId}
                onSavePrompt={handleSavePrompt}
                savingPromptId={savingPromptId}
              />
            ))}
          </ul>

          {nextCursor && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full py-3 rounded-xl bg-surface-raised hover:bg-surface-hover text-primary text-sm font-medium transition-colors min-h-[44px] disabled:opacity-50"
            >
              {loadingMore ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Loading…
                </span>
              ) : (
                `Load more (${remaining} remaining)`
              )}
            </button>
          )}

          {!nextCursor && songs.length > 0 && (
            <p className="text-center text-xs text-muted py-2">All generations loaded</p>
          )}
        </>
      )}
    </div>
  );
}

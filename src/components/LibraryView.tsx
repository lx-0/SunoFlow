"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  PlayIcon,
  PauseIcon,
  MusicalNoteIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  HeartIcon,
  ArrowUpOnSquareStackIcon,
} from "@heroicons/react/24/solid";
import {
  HeartIcon as HeartOutlineIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import type { Song } from "@prisma/client";
import { getRatings, type SongRating } from "@/lib/ratings";
import { downloadSongFile } from "@/lib/download";
import { exportAsZip, exportAsM3U, type ExportableSong } from "@/lib/export";
import { useToast } from "./Toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StarDisplay({ stars }: { stars: number }) {
  return (
    <span className="text-yellow-400 text-xs">
      {"★".repeat(stars)}
      {"☆".repeat(5 - stars)}
    </span>
  );
}

// ─── Inline audio player bar ──────────────────────────────────────────────────

interface PlayerBarProps {
  currentTime: number;
  duration: number;
  hasAudio: boolean;
  onSeek: (pct: number) => void;
}

function PlayerBar({ currentTime, duration, hasAudio, onSeek }: PlayerBarProps) {
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mt-2 space-y-1">
      {/* Seek bar */}
      <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
        <div
          className="absolute inset-y-0 left-0 bg-violet-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          disabled={!hasAudio}
          onChange={(e) => onSeek(Number(e.target.value) / 100)}
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full opacity-0 cursor-pointer disabled:cursor-default min-h-[44px]"
          aria-label="Seek"
        />
      </div>
      {/* Time display */}
      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

const FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Favorites", value: "favorites" },
  { label: "3★+", value: "3" },
  { label: "4★+", value: "4" },
  { label: "5★", value: "5" },
];

// ─── Status badges ────────────────────────────────────────────────────────────

function GeneratingBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/50 border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 text-xs font-medium">
      <svg
        className="animate-spin h-3 w-3"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Generating…
    </span>
  );
}

function FailedBadge({ message }: { message?: string | null }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-xs font-medium"
      title={message ?? "Generation failed"}
    >
      Failed
    </span>
  );
}

// ─── Polling hook ─────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 20;

function usePollSong(song: Song, onUpdate: (updated: Song) => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);
  const attemptsRef = useRef(song.pollCount);

  useEffect(() => {
    activeRef.current = true;
    attemptsRef.current = song.pollCount;

    if (song.generationStatus !== "pending") return;

    async function poll() {
      if (!activeRef.current) return;
      try {
        const res = await fetch(`/api/songs/${song.id}/status`);
        if (!res.ok) return;
        const data = (await res.json()) as { song: Song };
        if (!activeRef.current) return;
        onUpdate(data.song);
        if (data.song.generationStatus === "pending" && attemptsRef.current < MAX_POLL_ATTEMPTS) {
          attemptsRef.current++;
          timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (activeRef.current) {
          timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    }

    timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.id]);
}

// ─── Add to playlist picker ───────────────────────────────────────────────────

interface PlaylistOption {
  id: string;
  name: string;
  _count: { songs: number };
}

function AddToPlaylistButton({ songId }: { songId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistOption[]>([]);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  async function handleOpen() {
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch("/api/playlists");
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data.playlists);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(playlistId: string) {
    setOpen(false);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Failed to add to playlist", "error");
        return;
      }
      toast("Added to playlist", "success");
    } catch {
      toast("Failed to add to playlist", "error");
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleOpen}
        aria-label="Add to playlist"
        className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-violet-400 transition-colors"
      >
        <QueueListIcon className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-1 w-48 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg z-20 overflow-hidden">
          {loading ? (
            <p className="px-4 py-3 text-sm text-gray-500">Loading…</p>
          ) : playlists.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">No playlists yet</p>
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => handleAdd(pl.id)}
                className="w-full text-left px-4 py-3 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-b last:border-b-0 border-gray-200 dark:border-gray-800"
              >
                {pl.name}
                <span className="text-xs text-gray-400 ml-1">
                  ({pl._count.songs})
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Song row (handles its own polling) ───────────────────────────────────────

interface SongRowProps {
  initialSong: Song;
  isActive: boolean;
  isPlaying: boolean;
  currentTime: number;
  audioDuration: number;
  rating: SongRating | undefined;
  downloadProgress: number | null;
  downloadError: string | null;
  onTogglePlay: (song: Song) => void;
  onDownload: (song: Song) => void;
  onSeek: (pct: number) => void;
  onUpdate: (updated: Song) => void;
  onToggleFavorite: (song: Song) => void;
}

function SongRow({
  initialSong,
  isActive,
  isPlaying,
  currentTime,
  audioDuration,
  rating,
  downloadProgress,
  downloadError,
  onTogglePlay,
  onDownload,
  onSeek,
  onUpdate,
  onToggleFavorite,
}: SongRowProps) {
  const { toast } = useToast();
  const [song, setSong] = useState(initialSong);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => { setSong(initialSong); }, [initialSong]);

  const handleUpdate = useCallback((updated: Song) => {
    if (song.generationStatus === "pending" && updated.generationStatus !== "pending") {
      if (updated.generationStatus === "ready") {
        toast(`"${updated.title ?? "Song"}" is ready!`, "success");
      } else if (updated.generationStatus === "failed") {
        toast(`"${updated.title ?? "Song"}" generation failed`, "error");
      }
    }
    setSong(updated);
    onUpdate(updated);
  }, [onUpdate, song.generationStatus, toast]);

  usePollSong(song, handleUpdate);

  const isPending = song.generationStatus === "pending";
  const isFailed = song.generationStatus === "failed";
  const hasAudio = Boolean(song.audioUrl) && !isPending;
  const isDownloading = downloadProgress !== null;

  async function handleShare() {
    setShareLoading(true);
    try {
      const res = await fetch(`/api/songs/${song.id}/share`, { method: "PATCH" });
      if (!res.ok) return;
      const data = await res.json();
      // Update local song state with share fields
      const updated = { ...song, isPublic: data.isPublic, publicSlug: data.publicSlug };
      setSong(updated);
      onUpdate(updated);
      // Copy URL to clipboard if now public
      if (data.isPublic && data.publicSlug) {
        const url = `${window.location.origin}/s/${data.publicSlug}`;
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
        toast("Share link copied to clipboard!", "success");
      } else if (!data.isPublic) {
        toast("Song is now private", "info");
      }
    } finally {
      setShareLoading(false);
    }
  }

  return (
    <li
      className={`bg-white dark:bg-gray-900 border rounded-xl overflow-hidden transition-colors ${
        isActive ? "border-violet-600" : "border-gray-200 dark:border-gray-800"
      } ${isPending ? "opacity-75" : ""}`}
    >
      {/* Top row: cover + title + play */}
      <div className="flex items-center gap-3 px-3 pt-3 pb-1">
        {/* Cover art / placeholder */}
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
          {song.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={song.imageUrl} alt={song.title ?? "Song"} className="w-full h-full object-cover" />
          ) : (
            <MusicalNoteIcon className="w-6 h-6 text-gray-400 dark:text-gray-600" />
          )}
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/library/${song.id}`}
            className="block text-sm font-medium text-gray-900 dark:text-white truncate hover:text-violet-400 transition-colors"
          >
            {song.title ?? "Untitled"}
          </Link>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {isPending && <GeneratingBadge />}
            {isFailed && <FailedBadge message={song.errorMessage} />}
            {!isPending && !isFailed && song.tags && (
              <span className="text-xs text-gray-500 truncate">
                {song.tags.split(",")[0].trim()}
              </span>
            )}
            {!isPending && song.duration && (
              <span className="text-xs text-gray-400 dark:text-gray-600 flex-shrink-0">
                {formatTime(song.duration)}
              </span>
            )}
          </div>
          {rating && (
            <div className="mt-0.5">
              <StarDisplay stars={rating.stars} />
            </div>
          )}
        </div>

        {/* Play/Pause button */}
        <button
          onClick={() => onTogglePlay(song)}
          disabled={!hasAudio}
          aria-label={isActive && isPlaying ? "Pause" : "Play"}
          className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
            hasAudio
              ? "bg-violet-600 hover:bg-violet-500 text-white"
              : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
          }`}
        >
          {isActive && isPlaying ? (
            <PauseIcon className="w-5 h-5" />
          ) : (
            <PlayIcon className="w-5 h-5 ml-0.5" />
          )}
        </button>
      </div>

      {/* Action buttons row */}
      <div className="flex items-center gap-2 px-3 pb-2">
        {/* Favorite button */}
        <button
          onClick={() => onToggleFavorite(song)}
          aria-label={song.isFavorite ? "Remove from favorites" : "Add to favorites"}
          className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
            song.isFavorite
              ? "text-pink-500 hover:text-pink-400"
              : "text-gray-400 dark:text-gray-500 hover:text-pink-400"
          }`}
        >
          {song.isFavorite ? (
            <HeartIcon className="w-5 h-5" />
          ) : (
            <HeartOutlineIcon className="w-5 h-5" />
          )}
        </button>

        {/* Share button */}
        <button
          onClick={handleShare}
          disabled={!hasAudio || shareLoading}
          aria-label={shareCopied ? "Link copied!" : song.isPublic ? "Make private" : "Share"}
          title={shareCopied ? "Link copied!" : song.isPublic ? "Make private" : "Share song"}
          className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
            shareCopied
              ? "bg-green-700 text-white"
              : song.isPublic
                ? "bg-violet-100 dark:bg-violet-800 hover:bg-violet-200 dark:hover:bg-violet-700 text-violet-700 dark:text-violet-300"
                : hasAudio
                  ? "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                  : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
          }`}
        >
          <ShareIcon className="w-5 h-5" />
        </button>

        {/* Download button */}
        <button
          onClick={() => onDownload(song)}
          disabled={!hasAudio || isDownloading}
          aria-label={isDownloading ? `Downloading ${downloadProgress}%` : "Download song"}
          className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
            hasAudio && !isDownloading
              ? "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
              : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
          }`}
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
        </button>

        {/* Add to playlist */}
        <AddToPlaylistButton songId={song.id} />
      </div>

      {/* Inline player bar — visible only for active song */}
      {isActive && (
        <div className="px-3 pb-3">
          <PlayerBar
            currentTime={currentTime}
            duration={audioDuration}
            hasAudio={hasAudio}
            onSeek={onSeek}
          />
        </div>
      )}

      {/* Download progress bar */}
      {isDownloading && downloadProgress !== null && downloadProgress < 100 && (
        <div className="px-3 pb-2">
          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Download error */}
      {downloadError && (
        <div className="px-3 pb-2">
          <p className="text-xs text-red-400">{downloadError}</p>
        </div>
      )}
    </li>
  );
}

// ─── Main LibraryView ─────────────────────────────────────────────────────────

// Adapt Song (Prisma) to the minimal shape downloadSongFile expects
function toDownloadable(song: Song) {
  return {
    id: song.id,
    title: song.title ?? "Untitled",
    audioUrl: song.audioUrl ?? "",
    tags: song.tags ?? undefined,
  };
}

export function LibraryView({ songs: initialSongs, title = "Library" }: { songs: Song[]; title?: string }) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [activeFilter, setActiveFilter] = useState("all");
  const [ratings, setRatings] = useState<Record<string, SongRating>>({});

  // per-song download state: progress 0–100, or null when idle
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({});

  // Export state
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ completed: number; total: number } | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    if (exportMenuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [exportMenuOpen]);

  // Load ratings from localStorage on mount
  useEffect(() => {
    setRatings(getRatings());
    // Create audio element once
    audioRef.current = new Audio();
    const audio = audioRef.current;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentSongId(null);
      setCurrentTime(0);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setAudioDuration(audio.duration);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.pause();
    };
  }, []);

  // Reload ratings when returning to the page (e.g. after rating on detail page)
  useEffect(() => {
    const handleFocus = () => setRatings(getRatings());
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleSongUpdate = useCallback((updated: Song) => {
    setSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  function handleTogglePlay(song: Song) {
    const audio = audioRef.current;
    if (!audio || !song.audioUrl) return;

    if (currentSongId === song.id) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(console.error);
      }
    } else {
      audio.pause();
      audio.src = song.audioUrl;
      setCurrentSongId(song.id);
      setCurrentTime(0);
      setAudioDuration(song.duration ?? 0);
      audio.play().catch(console.error);
    }
  }

  async function handleDownload(song: Song) {
    if (!song.audioUrl || song.id in downloadProgress) return;
    setDownloadErrors((e) => { const n = { ...e }; delete n[song.id]; return n; });
    setDownloadProgress((p) => ({ ...p, [song.id]: 0 }));
    try {
      await downloadSongFile(toDownloadable(song), (pct) =>
        setDownloadProgress((p) => ({ ...p, [song.id]: pct }))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Download failed";
      setDownloadErrors((e) => ({ ...e, [song.id]: msg }));
      toast(msg, "error");
    } finally {
      setTimeout(
        () => setDownloadProgress((p) => { const n = { ...p }; delete n[song.id]; return n; }),
        1500
      );
    }
  }

  function handleSeek(pct: number) {
    const audio = audioRef.current;
    if (!audio || audioDuration <= 0) return;
    audio.currentTime = pct * audioDuration;
  }

  async function handleToggleFavorite(song: Song) {
    // Optimistic update
    const newFav = !song.isFavorite;
    const optimistic = { ...song, isFavorite: newFav };
    handleSongUpdate(optimistic);

    try {
      const res = await fetch(`/api/songs/${song.id}/favorite`, { method: "PATCH" });
      if (!res.ok) {
        handleSongUpdate(song);
        toast("Failed to update favorite", "error");
      } else {
        toast(newFav ? "Added to favorites" : "Removed from favorites", "success");
      }
    } catch {
      handleSongUpdate(song);
      toast("Failed to update favorite", "error");
    }
  }

  const favoriteCount = songs.filter((s) => s.isFavorite).length;

  // Filter songs
  const filteredSongs = (() => {
    if (activeFilter === "all") return songs;
    if (activeFilter === "favorites") return songs.filter((s) => s.isFavorite);
    const minStars = Number(activeFilter);
    return songs.filter((s) => {
      const r = ratings[s.id];
      if (minStars === 5) return r?.stars === 5;
      return r && r.stars >= minStars;
    });
  })();

  function songsForExport(): ExportableSong[] {
    return filteredSongs
      .filter((s) => s.audioUrl && s.generationStatus === "ready")
      .map((s) => ({
        id: s.id,
        title: s.title,
        audioUrl: s.audioUrl!,
        tags: s.tags,
        duration: s.duration,
        createdAt: s.createdAt,
      }));
  }

  async function handleExportZip() {
    setExportMenuOpen(false);
    const toExport = songsForExport();
    if (toExport.length === 0) {
      toast("No songs available to export", "info");
      return;
    }
    if (toExport.length > 50) {
      toast(`Exporting ${toExport.length} songs — this may take a while`, "info");
    }
    setExporting(true);
    setExportProgress({ completed: 0, total: toExport.length });
    try {
      await exportAsZip(toExport, (completed, total) => {
        setExportProgress({ completed, total });
      });
      toast("ZIP export complete!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Export failed", "error");
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  }

  function handleExportM3U() {
    setExportMenuOpen(false);
    const toExport = songsForExport();
    if (toExport.length === 0) {
      toast("No songs available to export", "info");
      return;
    }
    try {
      exportAsM3U(toExport);
      toast("M3U playlist exported!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Export failed", "error");
    }
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{songs.length} songs</p>
        </div>

        {/* Export button */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setExportMenuOpen((o) => !o)}
            disabled={exporting}
            aria-label="Export library"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              exporting
                ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
            }`}
          >
            <ArrowUpOnSquareStackIcon className="w-4 h-4" />
            {exporting && exportProgress
              ? `${exportProgress.completed}/${exportProgress.total}`
              : "Export"}
          </button>

          {exportMenuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg z-20 overflow-hidden">
              <button
                onClick={handleExportZip}
                className="w-full text-left px-4 py-3 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Download as ZIP
              </button>
              <button
                onClick={handleExportM3U}
                className="w-full text-left px-4 py-3 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-t border-gray-200 dark:border-gray-800"
              >
                Export M3U playlist
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Export progress bar */}
      {exporting && exportProgress && (
        <div className="space-y-1">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.round((exportProgress.completed / exportProgress.total) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            Downloading {exportProgress.completed} of {exportProgress.total} songs…
          </p>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setActiveFilter(opt.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
              activeFilter === opt.value
                ? "bg-violet-600 text-white"
                : "bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {opt.label === "Favorites" && favoriteCount > 0
              ? `Favorites (${favoriteCount})`
              : opt.label}
          </button>
        ))}
      </div>

      {/* Song list */}
      {filteredSongs.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">
            {songs.length === 0
              ? "No songs in your library yet."
              : "No songs match this filter."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredSongs.map((song) => (
            <SongRow
              key={song.id}
              initialSong={song}
              isActive={currentSongId === song.id}
              isPlaying={isPlaying}
              currentTime={currentTime}
              audioDuration={audioDuration}
              rating={ratings[song.id]}
              downloadProgress={downloadProgress[song.id] ?? null}
              downloadError={downloadErrors[song.id] ?? null}
              onTogglePlay={handleTogglePlay}
              onDownload={handleDownload}
              onSeek={handleSeek}
              onUpdate={handleSongUpdate}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

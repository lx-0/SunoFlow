"use client";

/**
 * DownloadButton — a dropdown download button with format info and progress.
 *
 * Shows the song's native format (MP3 or WAV) with an estimated file size.
 * When a WAV URL is available, both formats are shown; for MP3-only songs,
 * only MP3 is shown (WAV requires a prior convert-wav step).
 *
 * All downloads go through the server-side proxy which embeds metadata tags.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowDownTrayIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { downloadSongFile, detectFormat } from "@/lib/download";
import { estimateAudioBytes, formatBytes } from "@/lib/audio-metadata";

export interface DownloadableSong {
  id: string;
  title: string | null | undefined;
  audioUrl: string;
  duration?: number | null;
  createdAt?: Date | string;
}

interface DownloadButtonProps {
  song: DownloadableSong;
  /** Additional CSS classes for the outer wrapper */
  className?: string;
  /** Compact mode hides the label text */
  compact?: boolean;
}

export function DownloadButton({ song, className = "", compact = false }: DownloadButtonProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const nativeFormat = detectFormat(song.audioUrl);
  const duration = song.duration ?? 0;

  const formatOptions: { format: "mp3" | "wav"; label: string; size: string; available: boolean }[] = [
    {
      format: "mp3",
      label: "MP3",
      size: formatBytes(estimateAudioBytes(duration, "mp3")),
      available: nativeFormat === "mp3",
    },
    {
      format: "wav",
      label: "WAV",
      size: formatBytes(estimateAudioBytes(duration, "wav")),
      available: nativeFormat === "wav",
    },
  ];

  // At least one format is always available (the native one)
  const availableOptions = formatOptions.filter((f) => f.available);
  const hasMultipleFormats = availableOptions.length > 1;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const doDownload = useCallback(
    async () => {
      if (progress !== null) return;
      setError(null);
      setOpen(false);
      try {
        await downloadSongFile(song, setProgress);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Download failed");
        setProgress(null);
      }
    },
    [song, progress]
  );

  const isDownloading = progress !== null;

  if (!hasMultipleFormats) {
    // Simple single-button (no dropdown needed)
    const opt = availableOptions[0];
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <button
          onClick={() => doDownload()}
          disabled={isDownloading || !song.audioUrl}
          aria-label={isDownloading ? `Downloading ${progress}%` : "Download song"}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors
            ${isDownloading
              ? "cursor-wait bg-violet-700/60 text-violet-300"
              : "bg-violet-700 hover:bg-violet-600 text-white disabled:opacity-50"
            }`}
        >
          <ArrowDownTrayIcon className="w-4 h-4 shrink-0" />
          {!compact && (
            <span>
              {isDownloading
                ? progress === 100
                  ? "Done"
                  : `${progress}%`
                : "Download"}
            </span>
          )}
          {!compact && opt && duration > 0 && !isDownloading && (
            <span className="text-violet-300 text-xs">· {opt.label} · ~{opt.size}</span>
          )}
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {isDownloading && progress !== null && progress < 100 && (
          <div className="h-1 w-full rounded-full bg-gray-700 overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // Multi-format dropdown
  return (
    <div className={`relative flex flex-col gap-1 ${className}`} ref={menuRef}>
      <div className="flex items-stretch">
        {/* Primary action: download native format */}
        <button
          onClick={() => doDownload()}
          disabled={isDownloading || !song.audioUrl}
          aria-label={isDownloading ? `Downloading ${progress}%` : "Download song"}
          className={`flex items-center gap-1.5 rounded-l-lg px-3 py-2 text-sm font-medium transition-colors
            ${isDownloading
              ? "cursor-wait bg-violet-700/60 text-violet-300"
              : "bg-violet-700 hover:bg-violet-600 text-white disabled:opacity-50"
            }`}
        >
          <ArrowDownTrayIcon className="w-4 h-4 shrink-0" />
          {!compact && (
            <span>
              {isDownloading
                ? progress === 100
                  ? "Done"
                  : `${progress}%`
                : "Download"}
            </span>
          )}
        </button>

        {/* Chevron toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={isDownloading}
          aria-label="Choose download format"
          aria-expanded={open}
          className="flex items-center justify-center rounded-r-lg px-1.5 py-2 bg-violet-700 hover:bg-violet-600
            text-white border-l border-violet-600 transition-colors disabled:opacity-50"
        >
          <ChevronDownIcon
            className={`w-3 h-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-48 rounded-lg border border-gray-700
          bg-gray-900 shadow-xl py-1 text-sm">
          {availableOptions.map((opt) => (
            <button
              key={opt.format}
              onClick={() => doDownload()}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800 transition-colors"
            >
              <span className="font-medium text-white">{opt.label}</span>
              {duration > 0 && (
                <span className="text-gray-400 text-xs">~{opt.size}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
      {isDownloading && progress !== null && progress < 100 && (
        <div className="h-1 w-full rounded-full bg-gray-700 overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

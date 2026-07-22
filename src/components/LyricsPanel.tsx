"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { fetchWithTimeout } from "@/lib/fetch-client";

interface LineTimestamp {
  lineIndex: number;
  startTime: number;
}

interface LyricsPanelProps {
  lyrics: string;
  songTitle: string | null;
  onClose: () => void;
  /** Enables the synced (karaoke) view when the song has line timestamps. */
  songId?: string;
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  /** Seek handler taking a 0-1 fraction (same contract as PlayerWaveform). */
  onSeek?: (fraction: number) => void;
}

export function LyricsPanel({
  lyrics,
  songTitle,
  onClose,
  songId,
  currentTime = 0,
  duration = 0,
  isPlaying = false,
  onSeek,
}: LyricsPanelProps) {
  const [timestamps, setTimestamps] = useState<LineTimestamp[]>([]);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Idempotent: returns existing rows (manual taps or a prior sync), or
  // derives them once from Suno's word-aligned lyrics. Falls back to the
  // static view when unavailable (uploads, instrumentals, expired tasks).
  useEffect(() => {
    if (!songId) return;
    let cancelled = false;
    setTimestamps([]);
    fetchWithTimeout(`/api/songs/${songId}/lyrics/timestamps/sync`, {
      method: "POST",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.timestamps)) return;
        setTimestamps(data.timestamps as LineTimestamp[]);
      })
      .catch(() => {
        // Static lyrics view remains the fallback.
      });
    return () => {
      cancelled = true;
    };
  }, [songId]);

  const lines = useMemo(() => lyrics.split("\n"), [lyrics]);

  const tsMap = useMemo(
    () => new Map(timestamps.map((t) => [t.lineIndex, t.startTime])),
    [timestamps],
  );

  const byStartTime = useMemo(
    () => [...timestamps].sort((a, b) => a.startTime - b.startTime),
    [timestamps],
  );

  const activeLineIndex = useMemo(() => {
    let idx = -1;
    for (const t of byStartTime) {
      if (t.startTime <= currentTime) idx = t.lineIndex;
      else break;
    }
    return idx;
  }, [byStartTime, currentTime]);

  useEffect(() => {
    if (activeLineRef.current && isPlaying) {
      activeLineRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [activeLineIndex, isPlaying]);

  return (
    <div
      role="dialog"
      aria-label="Song lyrics panel"
      className="bg-gray-900/95 border border-gray-700 rounded-t-2xl shadow-2xl overflow-hidden w-full md:max-w-[600px] md:ml-auto animate-slide-in"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div>
          <h2 className="text-sm font-semibold text-white">Lyrics</h2>
          {songTitle && (
            <p className="text-xs text-gray-400 truncate max-w-[260px]">{songTitle}</p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close lyrics"
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
        >
          <Icon icon={X} fill="currentColor" className="w-5 h-5" />
        </button>
      </div>

      {/* Lyrics content */}
      <div className="max-h-[60vh] md:max-h-[60vh] overflow-y-auto px-4 py-4">
        {timestamps.length > 0 ? (
          <div className="space-y-0.5">
            {lines.map((line, i) => {
              const isActive = i === activeLineIndex;
              const lineTs = tsMap.get(i);
              const seekable =
                lineTs !== undefined && onSeek !== undefined && duration > 0;
              return (
                <div
                  key={i}
                  ref={isActive ? activeLineRef : undefined}
                  onClick={
                    seekable ? () => onSeek(lineTs / duration) : undefined
                  }
                  className={`px-2 py-1 rounded-lg text-sm leading-relaxed transition-colors ${
                    isActive
                      ? "bg-violet-900/30 text-violet-300 font-medium"
                      : "text-gray-200"
                  } ${seekable ? "cursor-pointer hover:bg-gray-800" : ""}`}
                >
                  {line === "" ? (
                    <span className="opacity-0 select-none">·</span>
                  ) : (
                    line
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-200 whitespace-pre-line leading-relaxed">
            {lyrics}
          </p>
        )}
      </div>
    </div>
  );
}

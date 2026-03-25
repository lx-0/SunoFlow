"use client";

import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  PlayIcon,
  PauseIcon,
  ArrowLeftIcon,
  MusicalNoteIcon,
  ArrowsRightLeftIcon,
  LinkIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/24/solid";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompareSong {
  id: string;
  title: string | null;
  tags: string | null;
  prompt: string | null;
  lyrics: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  generationStatus: string;
  isInstrumental: boolean;
  createdAt: string;
  model?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Imperative panel handle ──────────────────────────────────────────────────

interface PanelHandle {
  play: () => void;
  pause: () => void;
  seekTo: (pct: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  isCurrentlyPlaying: () => boolean;
}

// ─── ComparePanel ─────────────────────────────────────────────────────────────

interface ComparePanelProps {
  song: CompareSong;
  label: "A" | "B";
  muted: boolean;
  onPlayStateChange: (playing: boolean, time: number) => void;
}

const ComparePanel = forwardRef<PanelHandle, ComparePanelProps>(
  ({ song, label, muted, onPlayStateChange }, ref) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(song.duration ?? 0);
    const [loaded, setLoaded] = useState(false);
    const [volume] = useState(1);
    const [localMuted, setLocalMuted] = useState(false);

    useImperativeHandle(ref, () => ({
      play: () => audioRef.current?.play().catch(() => {}),
      pause: () => audioRef.current?.pause(),
      seekTo: (pct: number) => {
        const audio = audioRef.current;
        if (!audio || audioDuration <= 0) return;
        audio.currentTime = pct * audioDuration;
      },
      getCurrentTime: () => audioRef.current?.currentTime ?? 0,
      getDuration: () => audioDuration,
      isCurrentlyPlaying: () => !audioRef.current?.paused,
    }));

    useEffect(() => {
      if (!song.audioUrl) return;
      const audio = new Audio(song.audioUrl);
      audioRef.current = audio;

      const onPlay = () => {
        setIsPlaying(true);
        onPlayStateChange(true, audio.currentTime);
      };
      const onPause = () => {
        setIsPlaying(false);
        onPlayStateChange(false, audio.currentTime);
      };
      const onEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        onPlayStateChange(false, 0);
      };
      const onTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };
      const onDurationChange = () => {
        if (isFinite(audio.duration)) setAudioDuration(audio.duration);
      };
      const onCanPlay = () => setLoaded(true);

      audio.addEventListener("play", onPlay);
      audio.addEventListener("pause", onPause);
      audio.addEventListener("ended", onEnded);
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.addEventListener("durationchange", onDurationChange);
      audio.addEventListener("canplay", onCanPlay);

      return () => {
        audio.pause();
        audio.removeEventListener("play", onPlay);
        audio.removeEventListener("pause", onPause);
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("timeupdate", onTimeUpdate);
        audio.removeEventListener("durationchange", onDurationChange);
        audio.removeEventListener("canplay", onCanPlay);
        audioRef.current = null;
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [song.audioUrl]);

    // Sync muted state (external + local)
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.volume = (muted || localMuted) ? 0 : volume;
    }, [muted, localMuted, volume]);

    function handleTogglePlay() {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    }

    function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
      const audio = audioRef.current;
      if (!audio || audioDuration <= 0) return;
      const pct = Number(e.target.value) / 100;
      audio.currentTime = pct * audioDuration;
    }

    const pct = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;
    const hasAudio = !!song.audioUrl && song.generationStatus === "ready";

    return (
      <div className="flex-1 min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
          <span
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
              label === "A"
                ? "bg-violet-600 text-white"
                : "bg-indigo-600 text-white"
            }`}
          >
            {label}
          </span>
          <Link
            href={`/library/${song.id}`}
            className="text-xs text-gray-400 hover:text-violet-500 transition-colors"
            title="Open song detail"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Cover image */}
        <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
          {song.imageUrl ? (
            <Image
              src={song.imageUrl}
              alt={song.title ?? "Song cover"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MusicalNoteIcon className="w-16 h-16 text-gray-300 dark:text-gray-600" />
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="p-4 space-y-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {song.title ?? "Untitled"}
            </h2>
            {song.tags && (
              <p className="text-xs text-violet-500 dark:text-violet-400 mt-0.5 truncate">{song.tags}</p>
            )}
          </div>

          {song.prompt && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">Prompt</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3">{song.prompt}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-xs text-gray-400">
            {song.duration != null && (
              <span>{formatTime(song.duration)}</span>
            )}
            {song.model && (
              <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{song.model}</span>
            )}
            {song.isInstrumental && (
              <span className="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded">
                instrumental
              </span>
            )}
          </div>

          {/* Player controls */}
          {hasAudio ? (
            <div className="space-y-2">
              {/* Progress bar */}
              <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                    label === "A" ? "bg-violet-500" : "bg-indigo-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={pct}
                  onChange={handleSeek}
                  className="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full opacity-0 cursor-pointer min-h-[44px]"
                  aria-label="Seek"
                />
              </div>

              <div className="flex items-center justify-between">
                {/* Play/Pause + time */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTogglePlay}
                    disabled={!loaded}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      loaded
                        ? label === "A"
                          ? "bg-violet-600 hover:bg-violet-500 text-white"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isPlaying ? (
                      <PauseIcon className="w-4 h-4" />
                    ) : (
                      <PlayIcon className="w-4 h-4 ml-0.5" />
                    )}
                  </button>
                  <span className="text-xs text-gray-400 tabular-nums">
                    {formatTime(currentTime)} / {formatTime(audioDuration)}
                  </span>
                </div>

                {/* Local mute toggle */}
                <button
                  onClick={() => setLocalMuted((m) => !m)}
                  aria-label={localMuted ? "Unmute" : "Mute"}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {localMuted || (muted && !localMuted) ? (
                    <SpeakerXMarkIcon className="w-4 h-4" />
                  ) : (
                    <SpeakerWaveIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
              {song.generationStatus === "ready" ? "No audio available" : `Status: ${song.generationStatus}`}
            </p>
          )}

          {/* Lyrics */}
          {song.lyrics && (
            <details className="group">
              <summary className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer select-none hover:text-violet-500 transition-colors">
                Lyrics
              </summary>
              <div className="mt-2 max-h-48 overflow-y-auto">
                <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                  {song.lyrics}
                </p>
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }
);
ComparePanel.displayName = "ComparePanel";

// ─── SongCompareView ──────────────────────────────────────────────────────────

interface SongCompareViewProps {
  songA: CompareSong;
  songB: CompareSong;
}

export function SongCompareView({ songA, songB }: SongCompareViewProps) {
  const panelARef = useRef<PanelHandle>(null);
  const panelBRef = useRef<PanelHandle>(null);

  const [syncEnabled, setSyncEnabled] = useState(true);
  const [abFocus, setAbFocus] = useState<"both" | "A" | "B">("both");
  const [copied, setCopied] = useState(false);

  // When sync is enabled: mirror play state and seek across panels
  const handlePanelPlayStateChange = useCallback(
    (source: "A" | "B", playing: boolean, time: number) => {
      if (!syncEnabled) return;
      const target = source === "A" ? panelBRef : panelARef;
      const targetHandle = target.current;
      if (!targetHandle) return;

      if (playing) {
        const dur = targetHandle.getDuration();
        if (dur > 0) targetHandle.seekTo(time / dur);
        targetHandle.play();
      } else {
        targetHandle.pause();
      }
    },
    [syncEnabled]
  );

  // Periodic time-sync to correct drift (runs when sync is enabled)
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!syncEnabled) {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      return;
    }

    syncIntervalRef.current = setInterval(() => {
      const a = panelARef.current;
      const b = panelBRef.current;
      if (!a || !b) return;

      const aPlaying = a.isCurrentlyPlaying();
      const bPlaying = b.isCurrentlyPlaying();

      // Only correct drift if both are playing
      if (aPlaying && bPlaying) {
        const tA = a.getCurrentTime();
        const tB = b.getCurrentTime();
        const drift = Math.abs(tA - tB);
        if (drift > 0.5) {
          const durB = b.getDuration();
          if (durB > 0) b.seekTo(tA / durB);
        }
      }
    }, 1000);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [syncEnabled]);

  // A/B focus: mute/unmute panels
  const aMuted = abFocus === "B";
  const bMuted = abFocus === "A";

  function handleCopyLink() {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  function handleAbSwitch() {
    setAbFocus((f) => {
      if (f === "both") return "A";
      if (f === "A") return "B";
      return "both";
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link
            href="/library"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Library
          </Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">Compare</span>

          <div className="ml-auto flex items-center gap-2">
            {/* Sync toggle */}
            <button
              onClick={() => setSyncEnabled((s) => !s)}
              title={syncEnabled ? "Disable sync" : "Enable sync"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                syncEnabled
                  ? "bg-violet-600 text-white hover:bg-violet-500"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
              Sync {syncEnabled ? "On" : "Off"}
            </button>

            {/* A/B switch */}
            <button
              onClick={handleAbSwitch}
              title="Cycle A / B / Both focus"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Focus:{" "}
              <span className="font-bold">
                {abFocus === "both" ? "Both" : abFocus}
              </span>
            </button>

            {/* Copy link */}
            <button
              onClick={handleCopyLink}
              title="Copy compare link"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              {copied ? "Copied!" : "Share"}
            </button>
          </div>
        </div>
      </div>

      {/* Comparison panels */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <ComparePanel
            ref={panelARef}
            song={songA}
            label="A"
            muted={aMuted}
            onPlayStateChange={(playing, time) => handlePanelPlayStateChange("A", playing, time)}
          />
          <ComparePanel
            ref={panelBRef}
            song={songB}
            label="B"
            muted={bMuted}
            onPlayStateChange={(playing, time) => handlePanelPlayStateChange("B", playing, time)}
          />
        </div>

        {/* Sync legend */}
        <p className="mt-4 text-xs text-center text-gray-400 dark:text-gray-500">
          {syncEnabled
            ? "Sync is on — playing one panel will start both from the same position."
            : "Sync is off — panels play independently."}
        </p>
      </div>
    </div>
  );
}

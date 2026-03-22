"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// ─── Region selector (canvas-based overlay on waveform) ──────────────────────

interface RegionOverlayProps {
  duration: number;
  startS: number;
  endS: number;
  onChangeStart: (s: number) => void;
  onChangeEnd: (s: number) => void;
}

function RegionOverlay({ duration, startS, endS, onChangeStart, onChangeEnd }: RegionOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"start" | "end" | "region" | null>(null);
  const dragOffset = useRef(0);

  const pctStart = duration > 0 ? (startS / duration) * 100 : 0;
  const pctEnd = duration > 0 ? (endS / duration) * 100 : 0;

  function getTimeFromX(clientX: number): number {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || duration <= 0) return 0;
    const pct = clamp((clientX - rect.left) / rect.width, 0, 1);
    return Math.round(pct * duration * 10) / 10; // snap to 0.1s
  }

  const handlePointerDown = useCallback((e: React.PointerEvent, handle: "start" | "end" | "region") => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = handle;
    if (handle === "region") {
      const time = getTimeFromX(e.clientX);
      dragOffset.current = time - startS;
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startS, duration]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const time = getTimeFromX(e.clientX);

    if (dragging.current === "start") {
      const newStart = clamp(time, 0, endS - 6);
      onChangeStart(Math.round(newStart * 10) / 10);
    } else if (dragging.current === "end") {
      const newEnd = clamp(time, startS + 6, duration);
      onChangeEnd(Math.round(newEnd * 10) / 10);
    } else if (dragging.current === "region") {
      const regionLen = endS - startS;
      let newStart = time - dragOffset.current;
      newStart = clamp(newStart, 0, duration - regionLen);
      onChangeStart(Math.round(newStart * 10) / 10);
      onChangeEnd(Math.round((newStart + regionLen) * 10) / 10);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startS, endS, duration, onChangeStart, onChangeEnd]);

  const handlePointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Dimmed left region */}
      <div
        className="absolute inset-y-0 left-0 bg-black/40 pointer-events-none"
        style={{ width: `${pctStart}%` }}
      />
      {/* Dimmed right region */}
      <div
        className="absolute inset-y-0 right-0 bg-black/40 pointer-events-none"
        style={{ width: `${100 - pctEnd}%` }}
      />

      {/* Selected region (draggable) */}
      <div
        className="absolute inset-y-0 cursor-grab active:cursor-grabbing border-y-2 border-violet-400/50"
        style={{ left: `${pctStart}%`, width: `${pctEnd - pctStart}%` }}
        onPointerDown={(e) => handlePointerDown(e, "region")}
      />

      {/* Start handle */}
      <div
        className="absolute inset-y-0 w-3 cursor-col-resize z-20 group"
        style={{ left: `calc(${pctStart}% - 6px)` }}
        onPointerDown={(e) => handlePointerDown(e, "start")}
      >
        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-violet-500 group-hover:bg-violet-400 transition-colors" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-8 bg-violet-500 group-hover:bg-violet-400 rounded-sm transition-colors" />
      </div>

      {/* End handle */}
      <div
        className="absolute inset-y-0 w-3 cursor-col-resize z-20 group"
        style={{ left: `calc(${pctEnd}% - 6px)` }}
        onPointerDown={(e) => handlePointerDown(e, "end")}
      >
        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-violet-500 group-hover:bg-violet-400 transition-colors" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-8 bg-violet-500 group-hover:bg-violet-400 rounded-sm transition-colors" />
      </div>
    </div>
  );
}

// ─── Section Editor Modal ────────────────────────────────────────────────────

export interface SectionEditorProps {
  songId: string;
  songTitle: string;
  songTags: string | null;
  songDuration: number;
  audioUrl: string;
  onClose: () => void;
  onSubmitted: (newSongId: string) => void;
}

export function SectionEditor({
  songId,
  songTitle,
  songTags,
  songDuration,
  audioUrl,
  onClose,
  onSubmitted,
}: SectionEditorProps) {
  // Region selection
  const defaultLen = clamp(Math.min(30, songDuration * 0.3), 6, Math.min(60, songDuration * 0.5));
  const [startS, setStartS] = useState(0);
  const [endS, setEndS] = useState(defaultLen);

  // Form fields
  const [prompt, setPrompt] = useState("");
  const [tags, setTags] = useState(songTags || "");
  const [title, setTitle] = useState("");
  const [negativeTags, setNegativeTags] = useState("");

  // Waveform
  const waveContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wsRef = useRef<any>(null);
  const [waveLoaded, setWaveLoaded] = useState(false);
  const [waveError, setWaveError] = useState(false);

  // Preview playback
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize WaveSurfer
  const initWave = useCallback(async () => {
    if (!waveContainerRef.current) return;
    try {
      const WaveSurfer = (await import("wavesurfer.js")).default;
      if (wsRef.current) wsRef.current.destroy();

      const ws = WaveSurfer.create({
        container: waveContainerRef.current,
        waveColor: "#a78bfa",
        progressColor: "#7c3aed",
        cursorColor: "#7c3aed",
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 80,
        normalize: true,
        url: audioUrl,
        backend: "WebAudio",
        interact: false, // we handle interaction via the region overlay
      });

      ws.on("ready", () => setWaveLoaded(true));
      ws.on("error", () => setWaveError(true));
      ws.on("finish", () => setPreviewPlaying(false));

      wsRef.current = ws;
    } catch {
      setWaveError(true);
    }
  }, [audioUrl]);

  useEffect(() => {
    initWave();
    return () => {
      if (wsRef.current) {
        wsRef.current.destroy();
        wsRef.current = null;
      }
      if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
    };
  }, [initWave]);

  // Preview: play only the selected region
  function handlePreviewToggle() {
    const ws = wsRef.current;
    if (!ws || !waveLoaded) return;

    if (previewPlaying) {
      ws.pause();
      setPreviewPlaying(false);
      if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
      return;
    }

    // Seek to start of region and play
    ws.seekTo(startS / songDuration);
    ws.play();
    setPreviewPlaying(true);

    // Stop when reaching end of region
    previewIntervalRef.current = setInterval(() => {
      if (ws.getCurrentTime() >= endS) {
        ws.pause();
        setPreviewPlaying(false);
        if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
      }
    }, 100);
  }

  const sectionLen = endS - startS;
  const maxAllowed = songDuration * 0.5;
  const tooShort = sectionLen < 6;
  const tooLong = sectionLen > 60 || sectionLen > maxAllowed;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || tooShort || tooLong || !prompt.trim() || !tags.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/songs/${songId}/replace-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          tags: tags.trim(),
          title: title.trim() || undefined,
          infillStartS: startS,
          infillEndS: endS,
          negativeTags: negativeTags.trim() || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error ?? "Section replacement failed");
        return;
      }

      onSubmitted(result.song.id);
    } catch {
      setError("Section replacement failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 overflow-y-auto py-8">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Replace Section</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a region (6–60s, max 50% of song) and describe what should replace it.
        </p>

        {/* Waveform with region overlay */}
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <div ref={waveContainerRef} className="w-full" style={{ minHeight: 80 }} />
            {!waveLoaded && !waveError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-20 w-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
              </div>
            )}
            {waveError && (
              <div className="h-20 flex items-center justify-center text-sm text-gray-400">
                Could not load waveform
              </div>
            )}
            {waveLoaded && (
              <RegionOverlay
                duration={songDuration}
                startS={startS}
                endS={endS}
                onChangeStart={setStartS}
                onChangeEnd={setEndS}
              />
            )}
          </div>

          {/* Time range display + preview */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500 dark:text-gray-400">Start</label>
                <input
                  type="number"
                  value={startS}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) setStartS(clamp(v, 0, endS - 6));
                  }}
                  min={0}
                  max={endS - 6}
                  step={0.1}
                  className="w-16 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs text-gray-900 dark:text-white text-center focus:outline-none focus:border-violet-500"
                />
              </div>
              <span className="text-xs text-gray-400">–</span>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500 dark:text-gray-400">End</label>
                <input
                  type="number"
                  value={endS}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) setEndS(clamp(v, startS + 6, songDuration));
                  }}
                  min={startS + 6}
                  max={songDuration}
                  step={0.1}
                  className="w-16 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-xs text-gray-900 dark:text-white text-center focus:outline-none focus:border-violet-500"
                />
              </div>
              <span className={`text-xs ${tooShort || tooLong ? "text-red-400" : "text-gray-400"}`}>
                {formatTime(sectionLen)}
              </span>
            </div>

            <button
              onClick={handlePreviewToggle}
              disabled={!waveLoaded}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {previewPlaying ? "Stop" : "Preview"}
            </button>
          </div>

          {(tooShort || tooLong) && (
            <p className="text-xs text-red-400">
              {tooShort ? "Section must be at least 6 seconds." : "Section must be at most 60 seconds and no more than 50% of the song."}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Replacement prompt *
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what should replace this section..."
              rows={3}
              required
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Style / tags *
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. pop, rock, electronic"
              required
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={songTitle ? `${songTitle} (section replaced)` : ""}
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Negative tags (optional)
            </label>
            <input
              type="text"
              value={negativeTags}
              onChange={(e) => setNegativeTags(e.target.value)}
              placeholder="Styles to avoid, e.g. screaming, distortion"
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting || tooShort || tooLong || !prompt.trim() || !tags.trim()}
            className="w-full px-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
          >
            {submitting ? "Replacing section..." : "Replace Section"}
          </button>
        </form>
      </div>
    </div>
  );
}

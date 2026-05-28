"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownTrayIcon,
  MusicalNoteIcon,
  ArrowPathIcon,
  FilmIcon,
} from "@heroicons/react/24/solid";
import { useToast } from "../Toast";

type ExportFormat = "wav" | "midi" | "mp4";
type ExportStatus = "idle" | "converting" | "done" | "error";
type VideoStatus = "idle" | "polling" | "ready" | "error";

interface SongExportPanelProps {
  songId: string;
  hasAudio: boolean;
  initialVideoUrl: string | null;
}

export function SongExportPanel({ songId, hasAudio, initialVideoUrl }: SongExportPanelProps) {
  const { toast } = useToast();

  const [exports, setExports] = useState<Record<ExportFormat, { status: ExportStatus; taskId?: string; error?: string }>>({
    wav: { status: "idle" },
    midi: { status: "idle" },
    mp4: { status: "idle" },
  });

  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>(initialVideoUrl ? "ready" : "idle");
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoPollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (videoPollRef.current) clearInterval(videoPollRef.current);
    };
  }, []);

  function startVideoPolling(taskId: string) {
    if (videoPollRef.current) clearInterval(videoPollRef.current);
    setVideoStatus("polling");
    setVideoError(null);

    const poll = async () => {
      try {
        const res = await fetch(`/api/songs/${songId}/music-video/status?taskId=${encodeURIComponent(taskId)}`);
        const data = await res.json();
        if (!res.ok) {
          if (videoPollRef.current) clearInterval(videoPollRef.current);
          videoPollRef.current = null;
          setVideoStatus("error");
          setVideoError(data.error ?? "Failed to check video status");
          return;
        }
        if (data.status === "SUCCESS" && data.videoUrl) {
          if (videoPollRef.current) clearInterval(videoPollRef.current);
          videoPollRef.current = null;
          setVideoUrl(data.videoUrl);
          setVideoStatus("ready");
          toast("Music video is ready!", "success");
        } else if (data.status === "CREATE_TASK_FAILED" || data.status === "GENERATE_MP4_FAILED" || data.status === "CALLBACK_EXCEPTION") {
          if (videoPollRef.current) clearInterval(videoPollRef.current);
          videoPollRef.current = null;
          setVideoStatus("error");
          setVideoError(data.errorMessage ?? "Video generation failed");
          toast("Music video generation failed", "error");
        }
      } catch {
        if (videoPollRef.current) clearInterval(videoPollRef.current);
        videoPollRef.current = null;
        setVideoStatus("error");
        setVideoError("Network error while checking video status");
      }
    };

    poll();
    videoPollRef.current = setInterval(poll, 7000);
  }

  async function handleExport(format: ExportFormat) {
    if (exports[format].status === "converting") return;
    setExports((prev) => ({ ...prev, [format]: { status: "converting" } }));

    const endpoints: Record<ExportFormat, string> = {
      wav: `/api/songs/${songId}/convert-wav`,
      midi: `/api/songs/${songId}/generate-midi`,
      mp4: `/api/songs/${songId}/music-video`,
    };

    const labels: Record<ExportFormat, string> = {
      wav: "WAV conversion",
      midi: "MIDI extraction",
      mp4: "Music video generation",
    };

    try {
      const res = await fetch(endpoints[format], { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setExports((prev) => ({ ...prev, [format]: { status: "error", error: data.error } }));
        toast(data.error ?? `${labels[format]} failed`, "error");
        return;
      }
      setExports((prev) => ({ ...prev, [format]: { status: "done", taskId: data.taskId } }));
      if (format === "mp4" && data.taskId) {
        startVideoPolling(data.taskId);
      } else {
        toast(`${labels[format]} started! Task ID: ${data.taskId}`, "success");
      }
    } catch {
      setExports((prev) => ({ ...prev, [format]: { status: "error", error: `${labels[format]} failed` } }));
      toast(`${labels[format]} failed`, "error");
    }
  }

  if (!hasAudio) return null;

  return (
    <>
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Export</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            onClick={() => handleExport("wav")}
            disabled={exports.wav.status === "converting"}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
          >
            <ArrowDownTrayIcon className="w-4 h-4" aria-hidden="true" />
            {exports.wav.status === "converting" ? "Converting..." : exports.wav.status === "done" ? "WAV Sent" : "WAV"}
          </button>
          <button
            onClick={() => handleExport("midi")}
            disabled={exports.midi.status === "converting"}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
          >
            <MusicalNoteIcon className="w-4 h-4" aria-hidden="true" />
            {exports.midi.status === "converting" ? "Extracting..." : exports.midi.status === "done" ? "MIDI Sent" : "MIDI"}
          </button>
          <button
            onClick={() => handleExport("mp4")}
            disabled={exports.mp4.status === "converting" || videoStatus === "polling"}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
          >
            <FilmIcon className="w-4 h-4" aria-hidden="true" />
            {exports.mp4.status === "converting" || videoStatus === "polling"
              ? "Generating..."
              : videoStatus === "ready"
                ? "Regenerate Video"
                : "Music Video"}
          </button>
        </div>
        {(exports.wav.status === "error" || exports.midi.status === "error" || exports.mp4.status === "error") && (
          <p className="text-xs text-red-400">
            {exports.wav.error || exports.midi.error || exports.mp4.error}
          </p>
        )}
      </div>

      {videoStatus === "polling" && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Music Video</h2>
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <ArrowPathIcon className="w-5 h-5 animate-spin text-purple-500" aria-hidden="true" />
            <span>Generating your music video&hellip; This may take a minute.</span>
          </div>
        </div>
      )}

      {videoStatus === "ready" && videoUrl && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Music Video</h2>
          <div className="rounded-lg overflow-hidden bg-black">
            <video
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-[400px]"
            />
          </div>
          <a
            href={videoUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
          >
            <ArrowDownTrayIcon className="w-4 h-4" aria-hidden="true" />
            Download Video
          </a>
        </div>
      )}

      {videoStatus === "error" && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Music Video</h2>
          <p className="text-sm text-red-500">{videoError ?? "Video generation failed."}</p>
          <button
            onClick={() => handleExport("mp4")}
            className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
          >
            <ArrowPathIcon className="w-4 h-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}
    </>
  );
}

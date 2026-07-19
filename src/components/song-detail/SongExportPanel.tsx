"use client";

import { Download, Music, RefreshCw, Film } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "../Toast";
import { useSongExport } from "@/hooks/song-actions/use-song-export";

interface SongExportPanelProps {
  songId: string;
  hasAudio: boolean;
  initialVideoUrl: string | null;
}

export function SongExportPanel({ songId, hasAudio, initialVideoUrl }: SongExportPanelProps) {
  const { toast } = useToast();
  const { exports, videoUrl, videoStatus, videoError, handleExport } = useSongExport({
    songId,
    initialVideoUrl,
    toast,
  });

  if (!hasAudio) return null;

  return (
    <>
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-primary tracking-wide">Export</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            onClick={() => handleExport("wav")}
            disabled={exports.wav.status === "converting"}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
          >
            <Icon icon={Download} fill="currentColor" className="w-4 h-4" aria-hidden="true" />
            {exports.wav.status === "converting" ? "Converting..." : exports.wav.status === "done" ? "WAV Sent" : "WAV"}
          </button>
          <button
            onClick={() => handleExport("midi")}
            disabled={exports.midi.status === "converting"}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
          >
            <Icon icon={Music} fill="currentColor" className="w-4 h-4" aria-hidden="true" />
            {exports.midi.status === "converting" ? "Extracting..." : exports.midi.status === "done" ? "MIDI Sent" : "MIDI"}
          </button>
          <button
            onClick={() => handleExport("mp4")}
            disabled={exports.mp4.status === "converting" || videoStatus === "polling"}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
          >
            <Icon icon={Film} fill="currentColor" className="w-4 h-4" aria-hidden="true" />
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
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-primary tracking-wide">Music Video</h2>
          <div className="flex items-center gap-3 text-sm text-secondary">
            <Icon icon={RefreshCw} fill="currentColor" className="w-5 h-5 animate-spin text-purple-500" aria-hidden="true" />
            <span>Generating your music video&hellip; This may take a minute.</span>
          </div>
        </div>
      )}

      {videoStatus === "ready" && videoUrl && (
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-primary tracking-wide">Music Video</h2>
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
            <Icon icon={Download} fill="currentColor" className="w-4 h-4" aria-hidden="true" />
            Download Video
          </a>
        </div>
      )}

      {videoStatus === "error" && (
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-primary tracking-wide">Music Video</h2>
          <p className="text-sm text-red-500">{videoError ?? "Video generation failed."}</p>
          <button
            onClick={() => handleExport("mp4")}
            className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
          >
            <Icon icon={RefreshCw} fill="currentColor" className="w-4 h-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}
    </>
  );
}

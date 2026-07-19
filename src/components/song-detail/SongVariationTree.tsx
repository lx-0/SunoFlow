"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { formatDuration as formatTime } from "@/lib/time-format";
import type { VariationSummary } from "./types";

interface SongVariationTreeProps {
  songId: string;
  song: {
    title: string;
    tags: string | null;
    duration: number | null;
    audioUrl: string | null;
    lyrics: string | null;
  };
  variations: VariationSummary[];
  maxVariations: number;
  parentSongId: string | null;
  parentSongTitle: string | null;
}

export function SongVariationTree({
  songId,
  song,
  variations,
  maxVariations,
  parentSongId,
  parentSongTitle,
}: SongVariationTreeProps) {
  const [compareVariation, setCompareVariation] = useState<VariationSummary | null>(null);

  return (
    <>
      {parentSongId && (
        <div className="text-sm text-secondary">
          Variation of:{" "}
          <Link href={`/library/${parentSongId}`} className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 underline">
            {parentSongTitle ?? "Original song"}
          </Link>
        </div>
      )}

      {variations.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-primary tracking-wide">
            Variations ({variations.length}/{maxVariations})
          </h2>
          <div className="space-y-2">
            {variations.map((v) => (
              <div
                key={v.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  v.id === songId
                    ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20"
                    : "border-border hover:border-violet-300 dark:hover:border-violet-600"
                }`}
              >
                <Link href={`/library/${v.id}`} className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-primary block truncate">
                    {v.title || "Untitled variation"}
                  </span>
                  <span className="text-xs text-secondary block truncate">
                    {v.tags || v.prompt || "No description"}
                  </span>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      v.generationStatus === "ready"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                        : v.generationStatus === "failed"
                        ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                    }`}>
                      {v.generationStatus}
                    </span>
                    {v.isInstrumental && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                        instrumental
                      </span>
                    )}
                    {v.duration != null && (
                      <span className="text-xs text-muted">{formatTime(v.duration)}</span>
                    )}
                  </div>
                </Link>
                {v.id !== songId && v.generationStatus === "ready" && (
                  <div className="flex-shrink-0 flex flex-col gap-1">
                    <Link
                      href={`/compare?a=${songId}&b=${v.id}`}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                      title="Full compare page"
                    >
                      <Icon icon={ArrowLeftRight} fill="currentColor" className="w-3 h-3" />
                      Compare
                    </Link>
                    <button
                      onClick={() => setCompareVariation(compareVariation?.id === v.id ? null : v)}
                      className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
                        compareVariation?.id === v.id
                          ? "bg-indigo-600 text-white"
                          : "bg-surface-raised text-primary hover:bg-surface-hover"
                      }`}
                    >
                      {compareVariation?.id === v.id ? "Hide" : "Quick"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {compareVariation && (
        <div className="bg-surface border border-violet-300 dark:border-violet-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-primary tracking-wide">Comparison</h2>
            <button
              onClick={() => setCompareVariation(null)}
              className="text-xs text-secondary hover:text-primary"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-violet-500 uppercase tracking-wide">Current</span>
              <p className="text-sm font-medium text-primary truncate">{song.title || "Untitled"}</p>
              {song.tags && <p className="text-xs text-secondary">{song.tags}</p>}
              {song.duration != null && <p className="text-xs text-muted">{formatTime(song.duration)}</p>}
              {song.audioUrl && (
                <audio src={song.audioUrl} controls className="w-full h-8" preload="none" />
              )}
              {song.lyrics && (
                <div className="max-h-40 overflow-y-auto">
                  <p className="text-xs text-secondary whitespace-pre-line">{song.lyrics}</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold text-violet-500 uppercase tracking-wide">Variation</span>
              <p className="text-sm font-medium text-primary truncate">{compareVariation.title || "Untitled"}</p>
              {compareVariation.tags && <p className="text-xs text-secondary">{compareVariation.tags}</p>}
              {compareVariation.duration != null && <p className="text-xs text-muted">{formatTime(compareVariation.duration)}</p>}
              {compareVariation.audioUrl && (
                <audio src={compareVariation.audioUrl} controls className="w-full h-8" preload="none" />
              )}
              {compareVariation.lyrics && (
                <div className="max-h-40 overflow-y-auto">
                  <p className="text-xs text-secondary whitespace-pre-line">{compareVariation.lyrics}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { Spinner } from "./Spinner";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { useGenerationPoller } from "@/hooks/useGenerationPoller";
import { GenerationProgress } from "./GenerationProgress";
import { useMashupSubmit } from "./mashup-studio/useMashupSubmit";
import { useToast } from "./Toast";
import { TrackSelector } from "./mashup-studio/TrackSelector";
import { emptyTrack, type TrackState } from "./mashup-studio/types";

// --- Main Component ---

export function MashupStudio() {
  const { songs: trackedSongs, trackSong, clearAll } = useGenerationPoller();
  const { toast } = useToast();

  const [trackA, setTrackA] = useState<TrackState>(emptyTrack());
  const [trackB, setTrackB] = useState<TrackState>(emptyTrack());

  const {
    title,
    setTitle,
    style,
    setStyle,
    prompt,
    setPrompt,
    instrumental,
    setInstrumental,
    submitting,
    rateLimit,
    rateLimitExhausted,
    trackAReady,
    trackBReady,
    handleSubmit,
  } = useMashupSubmit({ trackA, trackB, toast, trackSong });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Mashup Studio
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Blend two songs together into a new creation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Track selectors side by side on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrackSelector
            label="Track A"
            track={trackA}
            onChange={setTrackA}
          />
          <TrackSelector
            label="Track B"
            track={trackB}
            onChange={setTrackB}
          />
        </div>

        {/* Generation options */}
        <div className="space-y-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Mashup options
          </h2>

          <div>
            <label
              htmlFor="mashup-title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Title (optional)
            </label>
            <input
              id="mashup-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Name your mashup"
              maxLength={200}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="mashup-style"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Style / Genre (optional)
            </label>
            <input
              id="mashup-style"
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder='e.g. "electronic dance", "lo-fi chill"'
              maxLength={200}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="mashup-prompt"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Lyrics / Prompt (optional)
            </label>
            <textarea
              id="mashup-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe how the mashup should sound or add custom lyrics"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={instrumental}
              onChange={(e) => setInstrumental(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Instrumental (no vocals)
            </span>
          </label>
        </div>

        {/* Rate limit */}
        {rateLimit && (
          <div
            className={`text-xs px-3 py-2 rounded-lg ${
              rateLimitExhausted
                ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                : rateLimit.remaining <= Math.ceil(rateLimit.limit * 0.2)
                  ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
                  : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
            }`}
          >
            {rateLimitExhausted
              ? `Rate limit reached. Resets at ${new Date(rateLimit.resetAt).toLocaleTimeString()}.`
              : `${rateLimit.remaining}/${rateLimit.limit} generations remaining this hour`}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={
            submitting ||
            !!rateLimitExhausted ||
            !trackAReady ||
            !trackBReady
          }
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white font-medium py-3 px-6 rounded-xl transition-colors disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Spinner className="h-4 w-4" />
              Creating mashup...
            </>
          ) : (
            <>
              <SparklesIcon className="h-4 w-4" />
              Generate Mashup
            </>
          )}
        </button>
      </form>

      {/* Generation progress */}
      <GenerationProgress songs={trackedSongs} onDismiss={clearAll} />
    </div>
  );
}

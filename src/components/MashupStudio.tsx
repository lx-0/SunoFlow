"use client";

import { useState } from "react";
import { Spinner } from "./Spinner";
import { Sparkles } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
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
        <h1 className="text-xl font-bold text-primary">
          Mashup Studio
        </h1>
        <p className="text-sm text-secondary mt-1">
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
        <div className="space-y-4 bg-surface-raised border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-primary">
            Mashup options
          </h2>

          <div>
            <label
              htmlFor="mashup-title"
              className="block text-sm font-medium text-secondary mb-1"
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
              className="w-full rounded-xl border border-border-strong bg-surface-raised px-4 py-3 text-sm text-primary placeholder-muted focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="mashup-style"
              className="block text-sm font-medium text-secondary mb-1"
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
              className="w-full rounded-xl border border-border-strong bg-surface-raised px-4 py-3 text-sm text-primary placeholder-muted focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="mashup-prompt"
              className="block text-sm font-medium text-secondary mb-1"
            >
              Lyrics / Prompt (optional)
            </label>
            <textarea
              id="mashup-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe how the mashup should sound or add custom lyrics"
              className="w-full rounded-xl border border-border-strong bg-surface-raised px-4 py-3 text-sm text-primary placeholder-muted focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={instrumental}
              onChange={(e) => setInstrumental(e.target.checked)}
              className="h-4 w-4 rounded border-border-strong text-violet-600 focus:ring-violet-500"
            />
            <span className="text-sm text-secondary">
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
                  : "bg-surface-raised text-secondary"
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
              <Icon icon={Sparkles} fill="currentColor" className="h-4 w-4" />
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

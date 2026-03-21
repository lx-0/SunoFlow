"use client";

import { useRouter } from "next/navigation";
import {
  MusicalNoteIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";
import type { GenerationState } from "@/hooks/useGenerationPoller";

const STATUS_CONFIG = {
  pending: { label: "Queued", color: "text-yellow-500", step: 0 },
  processing: { label: "Generating", color: "text-violet-500", step: 1 },
  ready: { label: "Complete", color: "text-green-500", step: 2 },
  failed: { label: "Failed", color: "text-red-500", step: 2 },
} as const;

const STEPS = ["Queued", "Generating", "Complete"];

function StatusIcon({ status }: { status: GenerationState["status"] }) {
  if (status === "ready")
    return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
  if (status === "failed")
    return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
  return (
    <svg
      className="animate-spin h-5 w-5 text-violet-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function SongProgress({ song }: { song: GenerationState }) {
  const router = useRouter();
  const config = STATUS_CONFIG[song.status];
  const isTerminal = song.status === "ready" || song.status === "failed";

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
      {/* Song header */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
          <MusicalNoteIcon className="h-5 w-5 text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {song.title ?? "Untitled song"}
          </p>
          <div className="flex items-center gap-1.5">
            <StatusIcon status={song.status} />
            <span
              className={`text-xs font-medium ${config.color}`}
              role="status"
              aria-live="polite"
            >
              {config.label}
            </span>
          </div>
        </div>
      </div>

      {/* Step progress bar */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const isCurrent = i === config.step && !isTerminal;
          const isDone =
            i < config.step || (isTerminal && song.status === "ready");
          const isFailed = isTerminal && song.status === "failed" && i === config.step;

          return (
            <div key={step} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
                  isFailed
                    ? "bg-red-500"
                    : isDone
                      ? "bg-green-500"
                      : isCurrent
                        ? "bg-violet-500 animate-pulse"
                        : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
              <span
                className={`text-[10px] ${
                  isCurrent || isDone || isFailed
                    ? "text-gray-700 dark:text-gray-300 font-medium"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {song.status === "failed" && song.errorMessage && (
        <p className="text-xs text-red-500 dark:text-red-400">
          {song.errorMessage}
        </p>
      )}

      {/* Action button */}
      {song.status === "ready" && (
        <button
          type="button"
          onClick={() => router.push(`/library/${song.songId}`)}
          className="w-full text-center text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl py-2 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
        >
          View in library
        </button>
      )}
    </div>
  );
}

export function GenerationProgress({
  songs,
  onDismiss,
}: {
  songs: GenerationState[];
  onDismiss: () => void;
}) {
  if (songs.length === 0) return null;

  const allDone = songs.every(
    (s) => s.status === "ready" || s.status === "failed"
  );

  return (
    <div className="space-y-3" aria-label="Generation progress">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Generation progress
        </h2>
        {allDone && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Dismiss
          </button>
        )}
      </div>
      {songs.map((song) => (
        <SongProgress key={song.songId} song={song} />
      ))}
    </div>
  );
}

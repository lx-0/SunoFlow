"use client";

import { ClockIcon } from "@heroicons/react/24/outline";
import { getRateLimitMeta } from "./helpers";
import type { RateLimitStatus } from "./types";

interface RateLimitPanelProps {
  rateLimit: RateLimitStatus;
}

export function RateLimitPanel({ rateLimit }: RateLimitPanelProps) {
  const { used, pct, barColor, minsLeft, isAtLimit, isNearLimit } = getRateLimitMeta(rateLimit);

  return (
    <div className="space-y-2">
      {/* Warning banner at 80% */}
      {isNearLimit && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300">
          <span className="font-medium">{rateLimit.remaining} generation{rateLimit.remaining === 1 ? "" : "s"} remaining</span>
        </div>
      )}

      {/* Quota panel with progress bar */}
      <div className={`rounded-xl px-4 py-3 text-sm border ${
        isAtLimit
          ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800"
          : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className={isAtLimit ? "text-red-700 dark:text-red-300 font-medium" : "text-gray-600 dark:text-gray-400"}>
            {isAtLimit ? "Rate limit reached" : "Generation quota"}
          </span>
          <span className={`font-semibold ${isAtLimit ? "text-red-700 dark:text-red-300" : "text-gray-900 dark:text-white"}`}>
            {used} / {rateLimit.limit} used
          </span>
        </div>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={rateLimit.limit}
          aria-label={`Generation quota: ${used} of ${rateLimit.limit} used`}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
            aria-hidden="true"
          />
        </div>

        {/* Reset time */}
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Resets in {minsLeft} minute{minsLeft === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}

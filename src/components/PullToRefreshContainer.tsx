"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface PullToRefreshContainerProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps content with pull-to-refresh behavior on mobile.
 * Shows a spinner indicator when pulling down.
 */
export function PullToRefreshContainer({
  onRefresh,
  children,
  className = "",
}: PullToRefreshContainerProps) {
  const { containerRef, pullDistance, refreshing, isPastThreshold } = usePullToRefresh({
    onRefresh,
  });

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto -webkit-overflow-scrolling-touch ${className}`}
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all"
          style={{ height: refreshing ? 48 : pullDistance }}
        >
          <ArrowPathIcon
            className={`w-5 h-5 text-violet-500 transition-transform ${
              refreshing ? "animate-spin" : ""
            } ${isPastThreshold ? "scale-110" : ""}`}
            style={{
              transform: refreshing
                ? undefined
                : `rotate(${Math.min(pullDistance * 3, 360)}deg)`,
            }}
          />
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {refreshing
              ? "Refreshing…"
              : isPastThreshold
                ? "Release to refresh"
                : "Pull to refresh"}
          </span>
        </div>
      )}

      {children}
    </div>
  );
}

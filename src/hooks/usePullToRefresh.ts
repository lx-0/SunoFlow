"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
}

/**
 * Pull-to-refresh hook for mobile. Attaches to a scrollable container.
 * Shows a pull indicator and triggers onRefresh when pulled past threshold.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
}: UsePullToRefreshOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pulling = useRef(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleTouchStart(e: TouchEvent) {
      // Only start pulling if scrolled to top
      if (el!.scrollTop > 0) return;
      touchStartY.current = e.touches[0].clientY;
      pulling.current = true;
    }

    function handleTouchMove(e: TouchEvent) {
      if (!pulling.current || refreshing) return;

      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy < 0) {
        pulling.current = false;
        setPullDistance(0);
        return;
      }

      // Apply resistance — pull feels heavier as you go further
      const distance = Math.min(dy * 0.5, maxPull);
      setPullDistance(distance);
    }

    function handleTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;

      if (pullDistance >= threshold && !refreshing) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullDistance, threshold, maxPull, refreshing, handleRefresh]);

  const isPastThreshold = pullDistance >= threshold;

  return { containerRef, pullDistance, refreshing, isPastThreshold };
}

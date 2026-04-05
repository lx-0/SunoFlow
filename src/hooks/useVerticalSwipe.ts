"use client";

import { useRef, useState, useCallback } from "react";

interface UseVerticalSwipeOptions {
  /** Which direction triggers the gesture: "up" expands, "down" dismisses */
  direction: "up" | "down";
  /** Fraction of container height to trigger completion (0–1, default 0.4) */
  threshold?: number;
  /** Velocity in px/ms above which a fast swipe completes regardless of distance */
  velocityThreshold?: number;
  /** Called when the swipe completes past the threshold */
  onSwipeComplete: () => void;
  /** Disable the hook */
  disabled?: boolean;
}

/**
 * Vertical drag gesture hook for drawer-style player expand/collapse.
 * Returns touch handlers to spread onto the draggable element,
 * plus the current `translateY` offset and `isDragging` flag.
 */
export function useVerticalSwipe({
  direction,
  threshold = 0.4,
  velocityThreshold = 0.5,
  onSwipeComplete,
  disabled = false,
}: UseVerticalSwipeOptions) {
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const isVertical = useRef<boolean | null>(null);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      startTime.current = Date.now();
      isVertical.current = null;
    },
    [disabled]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      // Determine axis intent on first significant movement (>10px)
      if (isVertical.current === null) {
        if (Math.abs(dy) > 10 || Math.abs(dx) > 10) {
          isVertical.current = Math.abs(dy) > Math.abs(dx);
        }
        return;
      }

      if (!isVertical.current) return;

      // Only allow movement in the configured direction
      if (direction === "up" && dy > 0) return; // swipe-up means negative dy
      if (direction === "down" && dy < 0) return; // swipe-down means positive dy

      setIsDragging(true);
      setTranslateY(dy);
    },
    [disabled, direction]
  );

  const onTouchEnd = useCallback(() => {
    if (!isDragging) {
      isVertical.current = null;
      return;
    }

    const elapsed = Date.now() - startTime.current;
    const velocity = Math.abs(translateY) / Math.max(1, elapsed);
    const containerHeight = typeof window !== "undefined" ? window.innerHeight : 800;
    const pastThreshold = Math.abs(translateY) > containerHeight * threshold;
    const fastSwipe = velocity > velocityThreshold;

    if (pastThreshold || fastSwipe) {
      onSwipeComplete();
    }

    setTranslateY(0);
    setIsDragging(false);
    isVertical.current = null;
  }, [isDragging, translateY, threshold, velocityThreshold, onSwipeComplete]);

  return {
    translateY,
    isDragging,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}

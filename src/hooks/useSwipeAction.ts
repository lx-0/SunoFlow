"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface UseSwipeActionOptions {
  /** Callback when swiped left past threshold */
  onSwipeLeft?: () => void;
  /** Callback when swiped right past threshold */
  onSwipeRight?: () => void;
  /** Minimum horizontal distance to trigger action (px) */
  threshold?: number;
  /** Maximum translateX applied during swipe (px) */
  maxSwipe?: number;
  /** Disable the hook */
  disabled?: boolean;
}

/**
 * Horizontal swipe-to-reveal actions for list items.
 * Returns a ref to attach to the swipeable element and the current offset.
 */
export function useSwipeAction({
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
  maxSwipe = 100,
  disabled = false,
}: UseSwipeActionOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);

  const reset = useCallback(() => {
    setOffset(0);
    setSwiping(false);
    isHorizontal.current = null;
  }, []);

  useEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;

    function handleTouchStart(e: TouchEvent) {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      isHorizontal.current = null;
      setSwiping(true);
    }

    function handleTouchMove(e: TouchEvent) {
      if (!swiping) return;
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      // Determine swipe direction on first significant movement
      if (isHorizontal.current === null) {
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          isHorizontal.current = Math.abs(dx) > Math.abs(dy);
        }
        return;
      }

      if (!isHorizontal.current) return;

      // Clamp offset
      const clamped = Math.max(-maxSwipe, Math.min(maxSwipe, dx));

      // Only allow directions that have handlers
      if (clamped < 0 && !onSwipeLeft) return;
      if (clamped > 0 && !onSwipeRight) return;

      setOffset(clamped);
    }

    function handleTouchEnd() {
      if (offset <= -threshold && onSwipeLeft) {
        onSwipeLeft();
      } else if (offset >= threshold && onSwipeRight) {
        onSwipeRight();
      }
      reset();
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [disabled, swiping, offset, threshold, maxSwipe, onSwipeLeft, onSwipeRight, reset]);

  return { ref, offset, swiping, reset };
}

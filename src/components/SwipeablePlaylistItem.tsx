"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";

interface SwipeablePlaylistItemProps {
  onSwipeRemove: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps a playlist item with swipe-left-to-reveal-remove on mobile.
 * Falls back to normal behavior on desktop (drag-and-drop still works).
 */
export function SwipeablePlaylistItem({
  onSwipeRemove,
  children,
  className = "",
}: SwipeablePlaylistItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);

  const reset = useCallback(() => {
    setOffset(0);
    setDragging(false);
    isHorizontal.current = null;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function handleTouchStart(e: TouchEvent) {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      isHorizontal.current = null;
      setDragging(true);
    }

    function handleTouchMove(e: TouchEvent) {
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      if (isHorizontal.current === null) {
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          isHorizontal.current = Math.abs(dx) > Math.abs(dy);
        }
        return;
      }

      if (!isHorizontal.current) return;

      // Only allow swiping left (negative)
      if (dx < 0) {
        setOffset(Math.max(dx, -100));
      }
    }

    function handleTouchEnd() {
      if (offset <= -80) {
        // Stay open to show remove button
        setOffset(-80);
      } else {
        reset();
      }
      setDragging(false);
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [offset, reset]);

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`} ref={ref}>
      {/* Background action (remove) — revealed on swipe */}
      <div className="absolute inset-y-0 right-0 flex items-center">
        <button
          onClick={() => {
            onSwipeRemove();
            reset();
          }}
          className="h-full w-20 bg-red-500 text-white flex items-center justify-center"
          aria-label="Remove from playlist"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Foreground content */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}

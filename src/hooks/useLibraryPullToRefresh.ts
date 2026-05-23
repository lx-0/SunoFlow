"use client";

import { useEffect, useRef, useState } from "react";

interface UseLibraryPullToRefreshOptions {
  onRefresh: () => Promise<void>;
}

export function useLibraryPullToRefresh({ onRefresh }: UseLibraryPullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullingRefresh, setIsPullingRefresh] = useState(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const pullState = { startY: 0, pulling: false };

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 5) return;
      pullState.startY = e.touches[0].clientY;
      pullState.pulling = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!pullState.pulling) return;
      const dy = e.touches[0].clientY - pullState.startY;
      if (dy <= 0) {
        pullState.pulling = false;
        setPullDistance(0);
        return;
      }
      setPullDistance(Math.min(dy * 0.5, 80));
    }

    function onTouchEnd() {
      if (!pullState.pulling) return;
      pullState.pulling = false;

      setPullDistance((dist) => {
        if (dist >= 60) {
          setIsPullingRefresh(true);
          onRefreshRef.current().finally(() => {
            setIsPullingRefresh(false);
            setPullDistance(0);
          });
          return 48;
        }

        return 0;
      });
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return {
    pullDistance,
    isPullingRefresh,
  };
}

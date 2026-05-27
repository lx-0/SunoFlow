"use client";

import { useEffect, useRef } from "react";

export function useSwipeToDismiss(
  containerRef: React.RefObject<HTMLElement | null>,
  active: boolean,
  onDismiss: () => void
) {
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const swiping = useRef(false);

  useEffect(() => {
    if (!active) return;
    const el = containerRef.current;
    if (!el) return;

    function handleTouchStart(e: TouchEvent) {
      touchStartX.current = e.touches[0].clientX;
      touchCurrentX.current = e.touches[0].clientX;
      swiping.current = true;
      el!.style.transition = "none";
    }

    function handleTouchMove(e: TouchEvent) {
      if (!swiping.current) return;
      touchCurrentX.current = e.touches[0].clientX;
      const dx = touchCurrentX.current - touchStartX.current;
      if (dx < 0) {
        el!.style.transform = `translateX(${dx}px)`;
      }
    }

    function handleTouchEnd() {
      if (!swiping.current) return;
      swiping.current = false;
      el!.style.transition = "";
      const dx = touchCurrentX.current - touchStartX.current;
      if (dx < -80) {
        el!.style.transform = "";
        onDismiss();
      } else {
        el!.style.transform = "";
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
  }, [active, containerRef, onDismiss]);
}

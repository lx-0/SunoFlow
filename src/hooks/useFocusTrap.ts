"use client";

import { useCallback, useEffect } from "react";

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  active: boolean
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !containerRef.current) return;
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [containerRef]
  );

  useEffect(() => {
    if (!active) return;
    document.addEventListener("keydown", handleKeyDown);
    const focusable = containerRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && focusable.length > 0) focusable[0].focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [active, handleKeyDown, containerRef]);
}

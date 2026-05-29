import { useRef } from "react";

export function useLongPress(onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    startPos.current = { x: t.clientX, y: t.clientY };
    timer.current = setTimeout(() => {
      onLongPress();
    }, 500);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!startPos.current || !timer.current) return;
    const t = e.touches[0];
    const dx = t.clientX - startPos.current.x;
    const dy = t.clientY - startPos.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function handleTouchEnd() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    startPos.current = null;
  }

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}

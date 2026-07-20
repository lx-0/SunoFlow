"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Anchored popover/dropdown positioning for a menu that must escape a clipping
 * ancestor (a virtualized list, a card with `overflow-hidden`, any scroll
 * container). Render the menu in a `createPortal(..., document.body)` with the
 * returned `menuStyle` (fixed positioning) so it can never be clipped.
 *
 * The menu flips above/below the trigger based on available viewport space,
 * right-aligns to the trigger, caps its height to the viewport, and closes on
 * outside-click, scroll (capture — also the inner scroll container), or resize
 * so the fixed position can't go stale.
 *
 * Usage:
 *   const { open, setOpen, triggerRef, menuRef, menuStyle } = useAnchoredMenu();
 *   <div ref={triggerRef}><button onClick={() => setOpen(v => !v)}>…</button></div>
 *   {open && menuStyle && createPortal(
 *     <div ref={menuRef} style={menuStyle} className="…">…</div>, document.body)}
 */
export function useAnchoredMenu(menuWidth = 192) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPos(null);
      return;
    }
    const gap = 4;
    const r = triggerRef.current.getBoundingClientRect();
    const left = Math.min(
      Math.max(r.right - menuWidth, 8),
      window.innerWidth - menuWidth - 8,
    );
    const spaceBelow = window.innerHeight - r.bottom - gap;
    const spaceAbove = r.top - gap;
    if (spaceBelow >= 240 || spaceBelow >= spaceAbove) {
      setPos({ left, top: r.bottom + gap, maxHeight: Math.max(spaceBelow - 8, 120) });
    } else {
      setPos({ left, bottom: window.innerHeight - r.top + gap, maxHeight: Math.max(spaceAbove - 8, 120) });
    }
  }, [open, menuWidth]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const menuStyle: CSSProperties | undefined = pos
    ? {
        position: "fixed",
        left: pos.left,
        top: pos.top,
        bottom: pos.bottom,
        width: menuWidth,
        maxHeight: pos.maxHeight,
      }
    : undefined;

  return { open, setOpen, triggerRef, menuRef, menuStyle };
}

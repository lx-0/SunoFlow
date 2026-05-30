"use client";

import { useEffect, useRef, useState } from "react";

interface TimedItem {
  id: string;
  timestamp: number;
}

interface UseTimedPopupsOptions<TItem extends TimedItem, TPopup> {
  items: TItem[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  displayDurationMs: number;
  makePopup: (item: TItem, key: number, leftPct: number) => TPopup;
  leftPctBounds?: { min: number; max: number };
}

export function useTimedPopups<TItem extends TimedItem, TPopup extends { key: number }>({
  items,
  currentTime,
  duration,
  isPlaying,
  displayDurationMs,
  makePopup,
  leftPctBounds = { min: 2, max: 98 },
}: UseTimedPopupsOptions<TItem, TPopup>) {
  const [activePopups, setActivePopups] = useState<TPopup[]>([]);
  const shownIdsRef = useRef<Set<string>>(new Set());
  const keyRef = useRef(0);

  const reset = () => {
    shownIdsRef.current = new Set();
    setActivePopups([]);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reset(); }, [items]);

  useEffect(() => {
    if (!isPlaying || items.length === 0 || duration <= 0) return;
    const triggered = items.filter(
      (item) => item.timestamp <= currentTime && !shownIdsRef.current.has(item.id),
    );
    if (triggered.length === 0) return;
    for (const item of triggered) shownIdsRef.current.add(item.id);
    const newPopups = triggered.map((item) => {
      const key = ++keyRef.current;
      const leftPct = Math.min(
        leftPctBounds.max,
        Math.max(leftPctBounds.min, (item.timestamp / duration) * 100),
      );
      return makePopup(item, key, leftPct);
    });
    setActivePopups((prev) => [...prev, ...newPopups]);
    const keys = newPopups.map((p) => p.key);
    const timer = setTimeout(() => {
      setActivePopups((prev) => prev.filter((p) => !keys.includes(p.key)));
    }, displayDurationMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, isPlaying]);

  return { activePopups, reset };
}

import { useCallback, useRef, useSyncExternalStore } from "react";
import { subscribe, getSnapshot, type PlaybackSnapshot } from "@/playback/audio";

// React binding for the playback controller's external store.
export function usePlayback(): PlaybackSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Subscribe to a SLICE of the playback snapshot. Re-renders only when the
 * selected value changes (Object.is per key for object selections), so
 * consumers that don't render playback position — the queue sheet, list
 * screens highlighting the current song — skip the per-tick churn while a
 * track plays. Position-driven UI (player, mini-player, lyrics) should keep
 * using usePlayback().
 *
 * The selector must return a primitive or a flat object of primitives/stable
 * references (snapshot fields) — deep selections would defeat the equality
 * check.
 *
 * RESTRICTION: the selector must depend ONLY on the snapshot, never on
 * props/state. The cache short-circuits on snapshot identity, so a selector
 * closing over changed props would return a stale selection until the next
 * store emit. Pass snapshot-only selectors; derive prop-dependent values
 * outside the hook.
 */
export function usePlaybackSelector<T>(selector: (s: PlaybackSnapshot) => T): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const cacheRef = useRef<{ snap: PlaybackSnapshot; value: T } | null>(null);

  // useSyncExternalStore requires getSnapshot to return the SAME reference
  // while the underlying store hasn't changed (else it loops); the cache also
  // preserves the previous selection identity when a store change doesn't
  // affect the selected slice, which is what skips the re-render.
  const getSelected = useCallback((): T => {
    const snap = getSnapshot();
    const cached = cacheRef.current;
    if (cached && cached.snap === snap) return cached.value;
    const next = selectorRef.current(snap);
    if (cached && shallowEqual(cached.value, next)) {
      cacheRef.current = { snap, value: cached.value };
      return cached.value;
    }
    cacheRef.current = { snap, value: next };
    return next;
  }, []);

  return useSyncExternalStore(subscribe, getSelected, getSelected);
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) =>
    Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

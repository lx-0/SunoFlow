import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { HttpError } from "@/api/client";

// useListResource: the whole list-screen resource lifecycle (favorites, history,
// playlists, feed, generations, notifications …) behind one hook. Contract of
// record, distilled from those screens:
//
//   const { data, error, refreshing, onRefresh, retry, showError } =
//     useListResource(fetchFavorites, { logTag: "favorites" });
//
// - First load + retry run the spinner path: data null, error cleared, fetch.
//   Screens render the spinner while `data === null && !showError`.
// - Focus revalidate (stale-while-revalidate): every focus refetches. The very
//   first focus IS the initial load — nothing is skipped. With data already
//   shown the revalidate is silent: data is never cleared, the fresh list is
//   swapped in on success. `focusRevalidate: false` limits the focus effect to
//   the initial load (refocus with data present skips the refetch).
// - Pull-to-refresh (onRefresh) never clears data; `refreshing` is set around
//   the fetch (finally). A refresh error keeps the data on screen — showError
//   stays false while data is present, so the list survives a flaky reload.
// - showError = error present AND no data: the screen's error EmptyState
//   condition (`error && !data` in the pre-hook screens).
// - Liveness: ONE generation counter, bumped on focus and on focus-cleanup and
//   checked before every async setState — a fetch resolving after blur (or
//   after a newer focus) is dropped instead of clobbering fresh state.
// - Errors: the fetcher may throw. Default mapping: HttpError →
//   "Failed to load (HTTP n)", anything else → "Network error". Override per
//   screen via `errorMessage(e)` (e.g. the pre-hook wording
//   "Failed to load favorites (HTTP 401)"). Every failure is logged as
//   "[<logTag>] load failed" (tag defaults to "useListResource").
// - Identity discipline: the focus callback is stable; fetcher/options/data are
//   read through latest-value refs so an inline fetcher or a data-dependent
//   check never re-runs the focus effect (see feed.tsx for the hard-won why).

export interface ListResourceOptions {
  /** Refetch on every screen focus (default true). false = initial load only. */
  focusRevalidate?: boolean;
  /** Map a fetcher error to the user-facing message (overrides the default). */
  errorMessage?: (e: unknown) => string;
  /** Tag for the console.error log line, e.g. "favorites" (default "useListResource"). */
  logTag?: string;
}

export interface ListResource<T> {
  /** null until the first successful fetch; never cleared by refresh/revalidate. */
  data: T | null;
  /** User-facing message from the most recent failed fetch; cleared on every fetch start. */
  error: string | null;
  /** True while a pull-to-refresh fetch is in flight. */
  refreshing: boolean;
  /** Pull-to-refresh handler: silent refetch with the refreshing flag around it. */
  onRefresh: () => void;
  /** Error-state CTA: back to the spinner path (data + error cleared) and refetch. */
  retry: () => void;
  /**
   * Truly silent refetch for post-action reloads (create/mark-read/...): no
   * refreshing flag — onRefresh would pop the RefreshControl spinner
   * programmatically — and data stays on screen until the fresh list swaps in.
   */
  revalidate: () => void;
  /** Local optimistic update of the loaded data (server reconcile via revalidate). */
  mutate: (updater: (prev: T | null) => T | null) => void;
  /** Render the error EmptyState: an error with nothing to show instead. */
  showError: boolean;
}

function defaultErrorMessage(e: unknown): string {
  return e instanceof HttpError ? `Failed to load (HTTP ${e.status})` : "Network error";
}

export function useListResource<T>(
  fetcher: () => Promise<T>,
  opts: ListResourceOptions = {},
): ListResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Latest-value refs: the focus callback must stay identity-stable, so it reads
  // fetcher/options/data through refs instead of depending on them (a `data`
  // dependency would re-run the focus effect on every load — see feed.tsx).
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const dataRef = useRef(data);
  dataRef.current = data;

  // One fetch shared by focus load, pull-to-refresh, and retry. The generation
  // counter drops writes from stale in-flight requests: the focus cleanup bumps
  // it, so a response arriving after blur (or after a newer focus) can't touch state.
  const genRef = useRef(0);

  const load = useCallback(async (isActive: () => boolean) => {
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (isActive()) setData(result);
    } catch (e) {
      if (isActive()) {
        setError((optsRef.current.errorMessage ?? defaultErrorMessage)(e));
      }
      console.error(`[${optsRef.current.logTag ?? "useListResource"}] load failed`, e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const gen = ++genRef.current;
      // Stale-while-revalidate: data is never cleared here — with data already
      // shown this revalidates silently; without data (first focus / after an
      // error) the screen is on the spinner/error path anyway.
      if (optsRef.current.focusRevalidate !== false || dataRef.current === null) {
        void load(() => genRef.current === gen);
      }
      return () => {
        genRef.current++;
      };
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    const gen = genRef.current;
    setRefreshing(true);
    // load never rejects (errors land in state), so finally is the whole story.
    void load(() => genRef.current === gen).finally(() => setRefreshing(false));
  }, [load]);

  const retry = useCallback(() => {
    setData(null);
    setError(null);
    const gen = genRef.current;
    void load(() => genRef.current === gen);
  }, [load]);

  const revalidate = useCallback(() => {
    const gen = genRef.current;
    void load(() => genRef.current === gen);
  }, [load]);

  const mutate = useCallback((updater: (prev: T | null) => T | null) => {
    setData(updater);
  }, []);

  return {
    data,
    error,
    refreshing,
    onRefresh,
    retry,
    revalidate,
    mutate,
    showError: error !== null && data === null,
  };
}

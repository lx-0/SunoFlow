"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseInfiniteScrollOptions<T, P extends { hasMore: boolean }> {
  active: boolean;
  initialItems?: T[];
  initialPagination: P;
  initialLoading?: boolean;
  initialCursor: number;
  fetchPage: (cursor: number, append: boolean) => Promise<{ items: T[]; pagination: P }>;
  getNextCursor: (pagination: P) => number;
  resetDeps?: unknown[];
  skipInitialFetch?: React.MutableRefObject<boolean>;
}

interface UseInfiniteScrollResult<T, P> {
  items: T[];
  pagination: P;
  loading: boolean;
  loadingMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement>;
}

export function useInfiniteScroll<T, P extends { hasMore: boolean }>({
  active,
  initialItems = [] as unknown as T[],
  initialPagination,
  initialLoading = false,
  initialCursor,
  fetchPage,
  getNextCursor,
  resetDeps = [],
  skipInitialFetch,
}: UseInfiniteScrollOptions<T, P>): UseInfiniteScrollResult<T, P> {
  const [items, setItems] = useState<T[]>(initialItems);
  const [pagination, setPagination] = useState<P>(initialPagination);
  const [loading, setLoading] = useState(initialLoading);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPageRef = useRef(fetchPage);
  fetchPageRef.current = fetchPage;

  const paginationRef = useRef(pagination);
  paginationRef.current = pagination;

  const getNextCursorRef = useRef(getNextCursor);
  getNextCursorRef.current = getNextCursor;

  const run = useCallback(async (cursor: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const result = await fetchPageRef.current(cursor, append);
      setItems((prev) => (append ? [...prev, ...result.items] : result.items));
      setPagination(result.pagination);
    } catch {
      // keep existing state
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!active) return;
    if (skipInitialFetch?.current) {
      skipInitialFetch.current = false;
      return;
    }
    setItems([]);
    run(initialCursor, false);
    // resetDeps intentionally spread — deps are caller-controlled
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, run, ...resetDeps]);

  useEffect(() => {
    if (!active) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || !pagination.hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          run(getNextCursorRef.current(paginationRef.current), true);
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [active, pagination.hasMore, loadingMore, run]);

  return { items, pagination, loading, loadingMore, sentinelRef };
}

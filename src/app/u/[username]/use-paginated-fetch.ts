import { useState, useCallback, useEffect } from "react";
import { apiGet } from "@/lib/api-client";

interface PaginatedResult<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

export function usePaginatedFetch<T>(
  url: string,
  responseKey: string
): PaginatedResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(
    async (p: number, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const data = await apiGet<Record<string, T[]> & { pagination: { hasMore: boolean } }>(
          `${url}?page=${p}`
        );
        setItems((prev) => (append ? [...prev, ...(data[responseKey] as T[])] : (data[responseKey] as T[])));
        setHasMore(data.pagination.hasMore);
        setPage(p);
      } catch {
        // ignore
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [url, responseKey]
  );

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    fetchPage(page + 1, true);
  }, [fetchPage, page]);

  return { items, loading, loadingMore, hasMore, loadMore };
}

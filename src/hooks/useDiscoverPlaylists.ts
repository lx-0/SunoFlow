"use client";

import { useState } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type {
  DiscoverPlaylist,
  PlaylistDiscoverPagination,
} from "@/app/[locale]/discover/discover-view.types";

const INITIAL_PAGINATION: PlaylistDiscoverPagination = {
  page: 1,
  limit: 20,
  totalPages: 1,
  total: 0,
  hasMore: false,
};

export function useDiscoverPlaylists({
  active,
  initialSort,
  initialGenre,
}: {
  active: boolean;
  initialSort: string;
  initialGenre: string;
}) {
  const [sort, setSort] = useState(initialSort);
  const [genre, setGenre] = useState(initialGenre);

  const { items: playlists, pagination, loading, loadingMore, sentinelRef } =
    useInfiniteScroll<DiscoverPlaylist, PlaylistDiscoverPagination>({
      active,
      initialPagination: INITIAL_PAGINATION,
      initialCursor: 1,
      fetchPage: async (page, _append) => {
        const params = new URLSearchParams({ page: String(page), sort });
        if (genre) params.set("genre", genre);
        const res = await fetch(`/api/playlists/discover?${params}`);
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        return { items: data.playlists, pagination: data.pagination };
      },
      getNextCursor: (p) => p.page + 1,
      resetDeps: [sort, genre],
    });

  return { playlists, pagination, sort, setSort, genre, setGenre, loading, loadingMore, sentinelRef };
}

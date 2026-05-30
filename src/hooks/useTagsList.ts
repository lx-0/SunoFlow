"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";

export interface TagSummary {
  id: string;
  name: string;
  color: string;
  _count?: { songTags: number };
}

interface TagsResponse {
  tags?: TagSummary[];
}

export const tagsListQueryKey = ["tags-list"] as const;

async function fetchTags(): Promise<TagSummary[]> {
  const data = await apiGet<TagsResponse>("/api/tags");
  return data.tags ?? [];
}

/**
 * User-defined tags. Rarely change, so a long staleTime keeps mobile quiet.
 */
export function useTagsList(enabled = true) {
  return useQuery({
    queryKey: tagsListQueryKey,
    queryFn: fetchTags,
    enabled,
    staleTime: 5 * 60_000,
  });
}

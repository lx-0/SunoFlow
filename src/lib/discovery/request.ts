import { z } from "zod";
import {
  zEnumParam,
  zIntParam,
  zLimitParam,
  zOffsetParam,
  zPageParam,
  zTrimmedParam,
} from "@/lib/query-params";

export const discoverSongsQuerySchema = z.object({
  page: zPageParam(),
  sortBy: zEnumParam(
    ["newest", "highest_rated", "most_played"] as const,
    "newest",
  ),
  tag: zTrimmedParam,
  mood: zTrimmedParam,
  tempoMin: zIntParam,
  tempoMax: zIntParam,
});

export type DiscoverSongsQueryInput = z.infer<typeof discoverSongsQuerySchema>;

export function toDiscoverSongsQuery(query: DiscoverSongsQueryInput) {
  return {
    sortBy: query.sortBy,
    tag: query.tag,
    mood: query.mood,
    tempoMin: query.tempoMin ?? null,
    tempoMax: query.tempoMax ?? null,
    page: query.page,
  } as const;
}

export const trendingSongsQuerySchema = z.object({
  sort: zEnumParam(["trending", "popular"] as const, "trending"),
  limit: zLimitParam(20, 100),
  offset: zOffsetParam(),
  genre: zTrimmedParam,
  mood: zTrimmedParam,
});

export type TrendingSongsQueryInput = z.infer<typeof trendingSongsQuerySchema>;

export const discoverFeedQuerySchema = z.object({
  page: zPageParam(),
  tag: zTrimmedParam,
  mood: zTrimmedParam,
});

export type DiscoverFeedQueryInput = z.infer<typeof discoverFeedQuerySchema>;

export const discoverPlaylistsQuerySchema = z.object({
  sort: zEnumParam(["trending", "recent", "popular"] as const, "trending"),
  genre: zTrimmedParam,
  page: zPageParam(),
  limit: zLimitParam(20, 100),
});

export type DiscoverPlaylistsQueryInput = z.infer<
  typeof discoverPlaylistsQuerySchema
>;

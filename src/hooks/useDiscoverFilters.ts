"use client";

import { useEffect, useState } from "react";
import {
  FALLBACK_GENRE_TAGS,
  FALLBACK_MOOD_TAGS,
} from "@/app/[locale]/discover/discover-view.utils";
import { apiGet } from "@/lib/api-client";

interface GenresResponse { genres: { name: string }[] }
interface MoodsResponse { moods: { name: string }[] }

export function useDiscoverFilters() {
  const [genreTags, setGenreTags] = useState<string[]>([]);
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiGet<GenresResponse>("/api/songs/genres").catch(() => null),
      apiGet<MoodsResponse>("/api/songs/moods").catch(() => null),
    ]).then(([genreData, moodData]) => {
      if (cancelled) return;
      const genres: string[] =
        genreData?.genres?.map((g) => g.name) ?? FALLBACK_GENRE_TAGS;
      const moods: string[] =
        moodData?.moods?.map((m) => m.name) ?? FALLBACK_MOOD_TAGS;
      setGenreTags(genres.length > 0 ? genres : FALLBACK_GENRE_TAGS);
      setMoodTags(moods.length > 0 ? moods : FALLBACK_MOOD_TAGS);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { genreTags, moodTags, loadingFilters: loading };
}

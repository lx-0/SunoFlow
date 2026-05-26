"use client";

import { useEffect, useState } from "react";
import {
  FALLBACK_GENRE_TAGS,
  FALLBACK_MOOD_TAGS,
} from "@/app/[locale]/discover/discover-view.utils";

export function useDiscoverFilters() {
  const [genreTags, setGenreTags] = useState<string[]>([]);
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch("/api/songs/genres")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/api/songs/moods")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([genreData, moodData]) => {
      if (cancelled) return;
      const genres: string[] =
        genreData?.genres?.map((g: { name: string }) => g.name) ??
        FALLBACK_GENRE_TAGS;
      const moods: string[] =
        moodData?.moods?.map((m: { name: string }) => m.name) ??
        FALLBACK_MOOD_TAGS;
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

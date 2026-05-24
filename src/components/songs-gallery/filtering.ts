import type { Song } from "@prisma/client";

interface SongTagRelation {
  tag: { id: string; name: string; color: string };
}

export type SongWithMeta = Song & {
  songTags: SongTagRelation[];
  isFavorite: boolean;
  favoriteCount: number;
  variationCount?: number;
};

export interface GalleryFilterState {
  search: string;
  selectedStyles: Set<string>;
  selectedMoods: Set<string>;
  dateFilter: number;
  offlineOnly: boolean;
  cachedIds: Set<string>;
}

export function applySongsGalleryFilters(
  songs: SongWithMeta[],
  filters: GalleryFilterState,
  now = Date.now(),
): SongWithMeta[] {
  let result = songs;

  if (filters.search.trim()) {
    const query = filters.search.toLowerCase();
    result = result.filter(
      (song) =>
        song.title?.toLowerCase().includes(query) ||
        song.prompt?.toLowerCase().includes(query) ||
        song.tags?.toLowerCase().includes(query),
    );
  }

  if (filters.selectedStyles.size > 0) {
    result = result.filter((song) => {
      const tags = (song.tags || "").toLowerCase();
      return [...filters.selectedStyles].some((style) => tags.includes(style.toLowerCase()));
    });
  }

  if (filters.selectedMoods.size > 0) {
    result = result.filter((song) => {
      const searchableText = `${song.tags || ""} ${song.prompt || ""}`.toLowerCase();
      return [...filters.selectedMoods].some((mood) => searchableText.includes(mood.toLowerCase()));
    });
  }

  if (filters.dateFilter >= 0) {
    if (filters.dateFilter === 0) {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      result = result.filter((song) => new Date(song.createdAt).getTime() >= startOfDay.getTime());
    } else {
      const cutoff = now - filters.dateFilter * 24 * 60 * 60 * 1000;
      result = result.filter((song) => new Date(song.createdAt).getTime() >= cutoff);
    }
  }

  if (filters.offlineOnly) {
    result = result.filter((song) => filters.cachedIds.has(song.id));
  }

  return result;
}

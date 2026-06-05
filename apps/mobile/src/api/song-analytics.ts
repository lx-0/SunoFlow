import { apiGet } from "./client";

// Per-song analytics for the Song Analytics screen. Backend returns headline
// counts plus a fixed 7-entry views series (oldest→newest, "YYYY-MM-DD"). The
// series is read DEFENSIVELY (Array.isArray guard, defaults to []) so a sparse
// or malformed response degrades to an empty chart instead of crashing.

export interface SongAnalytics {
  songId: string;
  title: string;
  totalPlays: number;
  totalViews: number;
  isPublic: boolean;
  views7d: { date: string; count: number }[];
}

export async function fetchSongAnalytics(id: string): Promise<SongAnalytics> {
  const res = await apiGet<SongAnalytics>(`/api/songs/${id}/analytics`);
  return {
    ...res,
    views7d: Array.isArray(res.views7d) ? res.views7d : [],
  };
}

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
  // Raw JSON at the boundary — coerce every scalar so a null/missing field can't
  // render as NaN/blank in the tiles or break the bar-chart math.
  const res = await apiGet<Record<string, unknown>>(`/api/songs/${id}/analytics`);
  const views7d = Array.isArray(res.views7d)
    ? res.views7d.filter(
        (v): v is { date: string; count: number } =>
          !!v && typeof v === "object" &&
          typeof (v as { date?: unknown }).date === "string" &&
          typeof (v as { count?: unknown }).count === "number",
      )
    : [];
  return {
    songId: typeof res.songId === "string" ? res.songId : id,
    title: typeof res.title === "string" ? res.title : "Untitled",
    totalPlays: typeof res.totalPlays === "number" ? res.totalPlays : 0,
    totalViews: typeof res.totalViews === "number" ? res.totalViews : 0,
    isPublic: res.isPublic === true,
    views7d,
  };
}

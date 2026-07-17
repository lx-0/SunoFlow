import { asBool, asNumber, asRecord, asString } from "@sunoflow/core";
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
  const res = asRecord(await apiGet<unknown>(`/api/songs/${id}/analytics`)) ?? {};
  const views7d = Array.isArray(res.views7d)
    ? res.views7d.flatMap((v) => {
        const r = asRecord(v);
        const date = r ? asString(r.date) : null;
        const count = r ? asNumber(r.count) : null;
        return date !== null && count !== null ? [{ date, count }] : [];
      })
    : [];
  return {
    songId: asString(res.songId) ?? id,
    title: asString(res.title) ?? "Untitled",
    totalPlays: asNumber(res.totalPlays, 0),
    totalViews: asNumber(res.totalViews, 0),
    isPublic: asBool(res.isPublic),
    views7d,
  };
}

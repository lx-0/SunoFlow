import { apiGet } from "./client";

// Lyrics for the player. Text comes from GET /api/songs/[id]/lyrics
// ({ original, edited }); optional line timestamps from .../lyrics/timestamps
// ([{ lineIndex, startTime }]). We merge them into per-line entries so the player
// can highlight the active line when timestamps exist.

export interface LyricLine {
  text: string;
  /** start time in seconds, or null if this line has no timestamp */
  time: number | null;
}

export async function fetchLyrics(songId: string): Promise<LyricLine[]> {
  const lyr = await apiGet<{ original?: string | null; edited?: string | null }>(
    `/api/songs/${songId}/lyrics`,
  );
  const text = (lyr?.edited ?? lyr?.original ?? "").trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/);

  // Timestamps are optional — a song may have lyrics but no synced timing.
  let stamps: { lineIndex: number; startTime: number }[] = [];
  try {
    const ts = await apiGet<{ timestamps?: { lineIndex: number; startTime: number }[] }>(
      `/api/songs/${songId}/lyrics/timestamps`,
    );
    stamps = Array.isArray(ts?.timestamps) ? ts.timestamps : [];
  } catch {
    // no timestamps → static lyrics
  }
  const byIndex = new Map(stamps.map((s) => [s.lineIndex, s.startTime]));

  return lines.map((line, i) => ({ text: line, time: byIndex.get(i) ?? null }));
}

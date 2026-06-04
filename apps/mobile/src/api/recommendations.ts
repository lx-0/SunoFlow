import { apiGet } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Personalised "For You" feed. The web route returns a single
// RecommendationResult ({ songs, total, strategy, generatedAt }) — not sectioned —
// where each song carries id/title/audioUrl/imageUrl/duration, exactly what
// mapApiSong reads. Mapped DEFENSIVELY: unplayable rows degrade to null and drop.
interface RecommendationsResponse {
  songs: unknown[];
}

export async function fetchRecommendations(): Promise<Song[]> {
  const res = await apiGet<RecommendationsResponse>("/api/recommendations");
  return (Array.isArray(res?.songs) ? res.songs : [])
    .map(mapApiSong)
    .filter((s): s is Song => s !== null);
}

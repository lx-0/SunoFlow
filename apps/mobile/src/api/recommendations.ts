import { unwrapList } from "@sunoflow/core";
import { apiGet } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Personalised "For You" feed. The web route returns a single
// RecommendationResult ({ songs, total, strategy, generatedAt }) — not sectioned —
// where each song carries id/title/audioUrl/imageUrl/duration, exactly what
// mapApiSong reads. Mapped DEFENSIVELY: unplayable rows degrade to null and drop.
export async function fetchRecommendations(): Promise<Song[]> {
  const res = await apiGet<unknown>("/api/recommendations");
  return unwrapList(res, "songs", mapApiSong);
}

import { getRelatedSongs } from "@/lib/recommendations";
import { createPublicRecommendationRoute } from "@/lib/songs/recommendation-route";

export const GET = createPublicRecommendationRoute(
  getRelatedSongs,
  (result) => ({ songs: result.songs, source: result.source }),
  "/api/songs/[id]/related",
);

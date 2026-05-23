import { getSimilarSongs } from "@/lib/recommendations";
import { createAuthRecommendationRoute } from "@/lib/songs/recommendation-route";

export const GET = createAuthRecommendationRoute(getSimilarSongs, "/api/songs/[id]/similar");

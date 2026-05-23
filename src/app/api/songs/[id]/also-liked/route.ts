import { getAlsoLiked } from "@/lib/recommendations";
import { createAuthRecommendationRoute } from "@/lib/songs/recommendation-route";

export const GET = createAuthRecommendationRoute(getAlsoLiked, "/api/songs/[id]/also-liked");

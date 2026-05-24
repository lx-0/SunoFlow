import { authDataRoute } from "@/lib/route-handler";
import { getDailyMix } from "@/lib/recommendations";

export const GET = authDataRoute(async (_request, { auth }) => {
  return getDailyMix(auth.userId);
}, { route: "/api/recommendations/daily" });

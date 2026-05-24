import { authDataRoute } from "@/lib/route-handler";
import { getInsights } from "@/lib/insights";

export const GET = authDataRoute(async (_request, { auth }) => {
  return getInsights(auth.userId);
}, { route: "/api/insights" });

import { authDataRoute } from "@/lib/route-handler";
import { getGenerationInsights } from "@/lib/analytics-data";

export const GET = authDataRoute(async (_request, { auth }) =>
  getGenerationInsights(auth.userId),
);

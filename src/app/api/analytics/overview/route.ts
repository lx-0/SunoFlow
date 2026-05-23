import { authDataRoute } from "@/lib/route-handler";
import { getUserOverview } from "@/lib/analytics-data";

export const GET = authDataRoute(async (_request, { auth }) =>
  getUserOverview(auth.userId),
);

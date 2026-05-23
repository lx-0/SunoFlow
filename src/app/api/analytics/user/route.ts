import { authDataRoute } from "@/lib/route-handler";
import { getUserDashboardStats } from "@/lib/analytics-data";

export const GET = authDataRoute(async (_request, { auth }) =>
  getUserDashboardStats(auth.userId),
);

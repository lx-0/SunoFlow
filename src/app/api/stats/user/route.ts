import { NextRequest } from "next/server";
import { authDataRoute } from "@/lib/route-handler";
import { getUserStats } from "@/lib/user-stats";

export const GET = authDataRoute(async (_request: NextRequest, { auth }) => {
  const stats = await getUserStats(auth.userId);
  return stats;
}, { route: "/api/stats/user" });

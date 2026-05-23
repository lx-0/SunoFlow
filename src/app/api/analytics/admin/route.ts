import { z } from "zod";
import { adminDataRoute } from "@/lib/route-handler";
import { getAdminAnalytics } from "@/lib/analytics-data";
import { zEnumParam } from "@/lib/query-params";

const analyticsQuery = z.object({
  range: zEnumParam(["7d", "30d", "90d", "all"] as const, "30d"),
});

export const GET = adminDataRoute<
  Record<string, never>,
  undefined,
  z.infer<typeof analyticsQuery>
>(
  async (_request, { query }) => getAdminAnalytics(query.range),
  { route: "/api/analytics/admin", query: analyticsQuery },
);

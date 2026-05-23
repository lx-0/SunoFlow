import { z } from "zod";
import { adminDataRoute } from "@/lib/route-handler";
import { getPromptQuality } from "@/lib/analytics-data";
import { zEnumParam } from "@/lib/query-params";

const promptQualityQuery = z.object({
  range: zEnumParam(["7d", "30d", "90d", "all"] as const, "30d"),
});

export const GET = adminDataRoute<
  Record<string, never>,
  undefined,
  z.infer<typeof promptQualityQuery>
>(
  async (_request, { query }) => getPromptQuality(query.range),
  { route: "/api/analytics/prompt-quality", query: promptQualityQuery },
);

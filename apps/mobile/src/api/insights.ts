import { insightsResultSchema, type InsightsResult } from "@sunoflow/core";
import { apiGet } from "./client";

// Insights ("feedback analytics") — per-tag / per-combo like-ratios + weekly trend
// derived from the user's 👍/👎 ratings. The contract is shared with the web app
// via @sunoflow/core (insightsResultSchema / InsightsResult).

const EMPTY_INSIGHTS: InsightsResult = {
  totalLikes: 0,
  totalDislikes: 0,
  tagBreakdown: [],
  topCombos: [],
  weeklyTrend: [],
};

/** GET /api/insights → InsightsResult (no wrapper). Returns empty on parse failure. */
export async function fetchInsights(): Promise<InsightsResult> {
  const raw = await apiGet<unknown>("/api/insights");
  const parsed = insightsResultSchema.safeParse(raw);
  return parsed.success ? parsed.data : EMPTY_INSIGHTS;
}

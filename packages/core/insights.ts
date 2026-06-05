import { z } from "zod";

// Insights ("feedback analytics") contract — shared by the web app
// (src/lib/insights) and the mobile client (apps/mobile/src/api/insights). Insights
// aggregate a user's 👍/👎 ratings into per-tag and per-combo like-ratios plus a
// weekly like/dislike trend, surfacing which tags/styles their audience likes.

export const tagStatSchema = z.object({
  tag: z.string(),
  likes: z.number(),
  dislikes: z.number(),
  total: z.number(),
  likeRatio: z.number(),
});

export const comboStatSchema = z.object({
  combo: z.string(),
  likes: z.number(),
  dislikes: z.number(),
  total: z.number(),
  likeRatio: z.number(),
});

export const weeklyDataPointSchema = z.object({
  week: z.string(),
  likes: z.number(),
  dislikes: z.number(),
});

export const insightsResultSchema = z.object({
  totalLikes: z.number(),
  totalDislikes: z.number(),
  tagBreakdown: z.array(tagStatSchema),
  topCombos: z.array(comboStatSchema),
  weeklyTrend: z.array(weeklyDataPointSchema),
});

export type TagStat = z.infer<typeof tagStatSchema>;
export type ComboStat = z.infer<typeof comboStatSchema>;
export type WeeklyDataPoint = z.infer<typeof weeklyDataPointSchema>;
export type InsightsResult = z.infer<typeof insightsResultSchema>;

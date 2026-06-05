import { describe, it, expect } from "vitest";
import { insightsResultSchema, tagStatSchema } from "./insights";

describe("insights schemas", () => {
  const validResult = {
    totalLikes: 10,
    totalDislikes: 2,
    tagBreakdown: [{ tag: "rock", likes: 5, dislikes: 1, total: 6, likeRatio: 0.83 }],
    topCombos: [{ combo: "rock, pop", likes: 3, dislikes: 0, total: 3, likeRatio: 1 }],
    weeklyTrend: [{ week: "2026-W22", likes: 4, dislikes: 1 }],
  };

  it("accepts a fully-populated result", () => {
    expect(insightsResultSchema.safeParse(validResult).success).toBe(true);
  });

  it("accepts an empty result (zero feedback)", () => {
    expect(
      insightsResultSchema.safeParse({
        totalLikes: 0,
        totalDislikes: 0,
        tagBreakdown: [],
        topCombos: [],
        weeklyTrend: [],
      }).success,
    ).toBe(true);
  });

  it("rejects wrong field types", () => {
    expect(insightsResultSchema.safeParse({ ...validResult, totalLikes: "10" }).success).toBe(false);
    expect(tagStatSchema.safeParse({ tag: "rock", likes: 1, dislikes: 0, total: 1, likeRatio: "1" }).success).toBe(false);
  });
});

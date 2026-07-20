import { describe, it, expect } from "vitest";
import { normalizeTier, type SubscriptionTier } from "@/lib/feature-gates";

describe("normalizeTier", () => {
  it("passes through every valid tier unchanged", () => {
    const tiers: SubscriptionTier[] = ["free", "starter", "pro", "studio"];
    for (const tier of tiers) {
      expect(normalizeTier(tier)).toBe(tier);
    }
  });

  it('falls back to "free" for unknown, missing, or non-string values', () => {
    expect(normalizeTier("enterprise")).toBe("free");
    expect(normalizeTier("")).toBe("free");
    expect(normalizeTier(undefined)).toBe("free");
    expect(normalizeTier(null)).toBe("free");
    expect(normalizeTier(42)).toBe("free");
    expect(normalizeTier({ tier: "pro" })).toBe("free");
  });
});

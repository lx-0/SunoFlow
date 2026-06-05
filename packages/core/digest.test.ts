import { describe, it, expect } from "vitest";
import { digestItemSchema, inspirationDigestSchema, isDigestFromToday } from "./digest";

describe("isDigestFromToday", () => {
  // Use mid-day instants so the toISOString round-trip can't roll over a day boundary.
  const now = new Date(2026, 5, 4, 12, 0, 0); // local June 4 2026, noon

  it("is true for a createdAt on the same local calendar day", () => {
    const created = new Date(2026, 5, 4, 9, 0, 0).toISOString();
    expect(isDigestFromToday(created, now)).toBe(true);
  });

  it("is false for a different day", () => {
    const created = new Date(2026, 5, 3, 12, 0, 0).toISOString();
    expect(isDigestFromToday(created, now)).toBe(false);
  });

  it("is false for the same month/day in a different year", () => {
    const created = new Date(2025, 5, 4, 12, 0, 0).toISOString();
    expect(isDigestFromToday(created, now)).toBe(false);
  });
});

describe("digest schemas", () => {
  const validItem = {
    source: "rss" as const,
    title: "A headline",
    mood: "energetic",
    topics: ["tech", "ai"],
    suggestedPrompt: "energetic vibe — tech, ai",
  };

  it("accepts a valid digest item (with and without optional fields)", () => {
    expect(digestItemSchema.safeParse(validItem).success).toBe(true);
    expect(digestItemSchema.safeParse({ ...validItem, link: "https://x", feedTitle: "Feed" }).success).toBe(true);
  });

  it("rejects items with a wrong-typed topics field or missing required fields", () => {
    expect(digestItemSchema.safeParse({ ...validItem, topics: "tech" }).success).toBe(false);
    expect(digestItemSchema.safeParse({ ...validItem, suggestedPrompt: undefined }).success).toBe(false);
    expect(digestItemSchema.safeParse({ ...validItem, source: "instagram" }).success).toBe(false);
  });

  it("accepts a full digest envelope", () => {
    const digest = { id: "d1", title: "Today's Picks", items: [validItem], createdAt: "2026-06-04T00:00:00Z" };
    expect(inspirationDigestSchema.safeParse(digest).success).toBe(true);
    expect(inspirationDigestSchema.safeParse({ ...digest, items: [{ bad: true }] }).success).toBe(false);
  });
});

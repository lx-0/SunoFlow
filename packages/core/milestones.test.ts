import { describe, it, expect } from "vitest";
import { MILESTONE_TYPES, MILESTONE_META, MILESTONE_CATALOG } from "./milestones";

describe("milestone catalog", () => {
  it("has a meta entry for every type", () => {
    for (const type of MILESTONE_TYPES) {
      expect(MILESTONE_META[type]).toBeDefined();
    }
    expect(Object.keys(MILESTONE_META).sort()).toEqual([...MILESTONE_TYPES].sort());
  });

  it("every meta entry has non-empty label, description, and emoji", () => {
    for (const type of MILESTONE_TYPES) {
      const m = MILESTONE_META[type];
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
      expect(m.emoji.length).toBeGreaterThan(0);
    }
  });

  it("CATALOG mirrors TYPES in order and merges the meta", () => {
    expect(MILESTONE_CATALOG.map((m) => m.type)).toEqual([...MILESTONE_TYPES]);
    expect(MILESTONE_CATALOG[0]).toEqual({ type: "first_song", ...MILESTONE_META.first_song });
  });
});

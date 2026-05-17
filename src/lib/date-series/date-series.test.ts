import { describe, it, expect } from "vitest";
import { fillDailySeries, getDateRangeMeta, mondayOfWeeksAgo, parseDateRange } from "./index";

describe("fillDailySeries", () => {
  it("fills gaps with zero counts", () => {
    const today = new Date().toISOString().slice(0, 10);
    const raw = [{ date: today, count: BigInt(10) }];

    const result = fillDailySeries(raw, 3);

    expect(result).toHaveLength(3);
    const todayEntry = result.find((d) => d.date === today);
    expect(todayEntry?.count).toBe(10);
    const gaps = result.filter((d) => d.date !== today);
    expect(gaps.every((d) => d.count === 0)).toBe(true);
  });

  it("returns the specified number of days", () => {
    const result = fillDailySeries([], 7);
    expect(result).toHaveLength(7);
    expect(result.every((d) => d.count === 0)).toBe(true);
  });
});

describe("mondayOfWeeksAgo", () => {
  it("returns the Monday of the current week when weeksAgo is 0", () => {
    const now = new Date("2025-06-04T12:00:00Z"); // Wednesday
    const result = mondayOfWeeksAgo(0, now);
    expect(result).toBe("2025-06-02"); // Monday of that week
  });

  it("returns the Monday of the previous week when weeksAgo is 1", () => {
    const now = new Date("2025-06-04T12:00:00Z"); // Wednesday
    const result = mondayOfWeeksAgo(1, now);
    expect(result).toBe("2025-05-26");
  });

  it("handles Sunday correctly", () => {
    const now = new Date("2025-06-01T12:00:00Z"); // Sunday
    const result = mondayOfWeeksAgo(0, now);
    expect(result).toBe("2025-05-26"); // Monday of that week (Sunday belongs to previous Monday's week)
  });

  it("defaults to current date when no reference provided", () => {
    const result = mondayOfWeeksAgo(0);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("getDateRangeMeta", () => {
  it("returns dense-window metadata for 7d", () => {
    const meta = getDateRangeMeta("7d");
    expect(meta.days).toBe(7);
    const msDiff = Date.now() - meta.sinceDate.getTime();
    expect(msDiff).toBeGreaterThanOrEqual(6 * 24 * 60 * 60 * 1000);
    expect(msDiff).toBeLessThanOrEqual(8 * 24 * 60 * 60 * 1000);
  });

  it("returns open-ended metadata for all", () => {
    const meta = getDateRangeMeta("all");
    expect(meta.days).toBeNull();
    expect(meta.sinceDate.toISOString()).toBe("1970-01-01T00:00:00.000Z");
  });

  it("keeps parseDateRange aligned with metadata", () => {
    const range = "90d";
    expect(parseDateRange(range).getTime()).toBe(getDateRangeMeta(range).sinceDate.getTime());
  });
});

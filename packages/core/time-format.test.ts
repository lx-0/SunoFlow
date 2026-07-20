import { describe, it, expect } from "vitest";
import { formatDuration, formatRelativeTime } from "./time-format";

describe("formatDuration", () => {
  it("returns the placeholder for nullish / non-finite input", () => {
    expect(formatDuration(null)).toBe("--:--");
    expect(formatDuration(undefined)).toBe("--:--");
    expect(formatDuration(NaN)).toBe("--:--");
    expect(formatDuration(Infinity)).toBe("--:--");
    expect(formatDuration(-Infinity)).toBe("--:--");
  });

  it("formats m:ss with a zero-padded seconds field", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(59)).toBe("0:59");
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(600)).toBe("10:00");
  });

  it("floors fractional seconds", () => {
    expect(formatDuration(65.9)).toBe("1:05");
  });

  it("does not roll minutes into hours (minutes keep counting up)", () => {
    expect(formatDuration(3661)).toBe("61:01");
  });
});

describe("formatRelativeTime", () => {
  const NOW = new Date("2026-07-20T12:00:00.000Z").getTime();
  const ago = (ms: number) => new Date(NOW - ms).toISOString();
  const SEC = 1000;
  const MIN = 60 * SEC;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it("returns 'just now' under a minute", () => {
    expect(formatRelativeTime(ago(0), NOW)).toBe("just now");
    expect(formatRelativeTime(ago(59 * SEC), NOW)).toBe("just now");
  });

  it("counts whole minutes below an hour", () => {
    expect(formatRelativeTime(ago(1 * MIN), NOW)).toBe("1m ago");
    expect(formatRelativeTime(ago(59 * MIN), NOW)).toBe("59m ago");
  });

  it("counts whole hours below a day", () => {
    expect(formatRelativeTime(ago(1 * HOUR), NOW)).toBe("1h ago");
    expect(formatRelativeTime(ago(23 * HOUR), NOW)).toBe("23h ago");
  });

  it("labels exactly one day as 'yesterday'", () => {
    expect(formatRelativeTime(ago(1 * DAY), NOW)).toBe("yesterday");
    expect(formatRelativeTime(ago(2 * DAY - 1), NOW)).toBe("yesterday");
  });

  it("counts whole days between yesterday and a week", () => {
    expect(formatRelativeTime(ago(2 * DAY), NOW)).toBe("2d ago");
    expect(formatRelativeTime(ago(6 * DAY), NOW)).toBe("6d ago");
  });

  it("falls back to a short month/day date once past a week (weeks range)", () => {
    const weeksAgo = ago(21 * DAY);
    expect(formatRelativeTime(weeksAgo, NOW)).toBe(
      new Date(weeksAgo).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    );
    // No relative "Nd ago" leaks into the weeks range.
    expect(formatRelativeTime(weeksAgo, NOW)).not.toMatch(/ago$/);
  });
});

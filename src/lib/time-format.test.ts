import { describe, expect, it } from "vitest";

import { formatDuration } from "@/lib/time-format";

describe("formatDuration", () => {
  it("formats zero seconds as 0:00", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it("formats positive durations as m:ss", () => {
    expect(formatDuration(65)).toBe("1:05");
  });

  it("returns placeholder for nullish and invalid values", () => {
    expect(formatDuration(null)).toBe("--:--");
    expect(formatDuration(undefined)).toBe("--:--");
    expect(formatDuration(Number.NaN)).toBe("--:--");
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("--:--");
  });
});

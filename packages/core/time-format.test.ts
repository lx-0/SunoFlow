import { describe, it, expect } from "vitest";
import { formatDuration } from "./time-format";

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

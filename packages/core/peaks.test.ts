import { describe, it, expect } from "vitest";
import { downsamplePeaks } from "./peaks";

describe("downsamplePeaks", () => {
  it("returns exactly numBars values", () => {
    expect(downsamplePeaks([0.1, 0.2, 0.3, 0.4, 0.5, 0.6], 3)).toHaveLength(3);
  });

  it("normalizes so the loudest bar is 1 and all bars are within 0..1", () => {
    const peaks = downsamplePeaks([0.1, 0.2, 0.3, 0.4], 2);
    expect(Math.max(...peaks)).toBeCloseTo(1, 5);
    for (const p of peaks) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("takes the max-amplitude per block (abs) then normalizes", () => {
    // blocks of 2: block0 -> max(|0|,|0.5|)=0.5, block1 -> max(|0|,|-1|)=1 → /1
    expect(downsamplePeaks([0, 0.5, 0, -1], 2)).toEqual([0.5, 1]);
  });

  it("returns all zeros for silent input (no divide-by-zero)", () => {
    expect(downsamplePeaks([0, 0, 0, 0], 4)).toEqual([0, 0, 0, 0]);
  });

  it("handles fewer samples than bars (trailing bars are 0)", () => {
    const peaks = downsamplePeaks([0, 1], 4);
    expect(peaks).toHaveLength(4);
    expect(peaks[peaks.length - 1]).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import {
  cycleRepeatMode,
  getNextQueueIndex,
  getPrevQueueIndex,
} from "@/components/queue/queue-navigation";

describe("queue-navigation", () => {
  it("returns next index inside queue bounds", () => {
    expect(getNextQueueIndex(1, 4, "off")).toBe(2);
  });

  it("returns null at queue end when repeat-all is off", () => {
    expect(getNextQueueIndex(2, 3, "off")).toBeNull();
  });

  it("wraps to index 0 at queue end when repeat-all is on", () => {
    expect(getNextQueueIndex(2, 3, "repeat-all")).toBe(0);
  });

  it("returns previous index inside queue bounds", () => {
    expect(getPrevQueueIndex(2, 4, "off")).toBe(1);
  });

  it("returns null at queue start when repeat-all is off", () => {
    expect(getPrevQueueIndex(0, 3, "off")).toBeNull();
  });

  it("wraps to last index at queue start when repeat-all is on", () => {
    expect(getPrevQueueIndex(0, 3, "repeat-all")).toBe(2);
  });

  it("cycles repeat mode off -> repeat-all -> repeat-one -> off", () => {
    expect(cycleRepeatMode("off")).toBe("repeat-all");
    expect(cycleRepeatMode("repeat-all")).toBe("repeat-one");
    expect(cycleRepeatMode("repeat-one")).toBe("off");
  });
});

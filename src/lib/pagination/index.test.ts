import { describe, expect, it } from "vitest";
import { offsetWindowPagination } from "@/lib/pagination";

describe("offsetWindowPagination", () => {
  it("returns expected shape and hasMore for in-range offsets", () => {
    expect(offsetWindowPagination(20, 20, 100)).toEqual({
      total: 100,
      limit: 20,
      offset: 20,
      hasMore: true,
    });
  });

  it("returns hasMore false at end of result window", () => {
    expect(offsetWindowPagination(80, 20, 100)).toEqual({
      total: 100,
      limit: 20,
      offset: 80,
      hasMore: false,
    });
  });

  it("clamps negative offset and non-positive limit", () => {
    expect(offsetWindowPagination(-10, 0, 5)).toEqual({
      total: 5,
      limit: 1,
      offset: 0,
      hasMore: true,
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  parseHistoryFilterUrlState,
  toGenerationsApiSearchParams,
  toHistoryFilterSearchParams,
} from "./filter-url-state";

describe("history filter URL state", () => {
  it("parses default values from empty search params", () => {
    expect(parseHistoryFilterUrlState(new URLSearchParams())).toEqual({
      status: "all",
      sort: "newest",
      q: "",
      from: "",
      to: "",
    });
  });

  it("falls back to newest sort when sort is invalid", () => {
    const parsed = parseHistoryFilterUrlState(new URLSearchParams({ sort: "invalid" }));
    expect(parsed.sort).toBe("newest");
  });

  it("serializes only non-default history filters", () => {
    const params = toHistoryFilterSearchParams({
      status: "ready",
      sort: "oldest",
      q: "lofi",
      from: "",
      to: "2026-05-25",
    });

    expect(params.toString()).toBe("status=ready&sort=oldest&q=lofi&to=2026-05-25");
  });

  it("maps history state to generations API query params", () => {
    const params = toGenerationsApiSearchParams(
      {
        status: "all",
        sort: "oldest",
        q: "synthwave",
        from: "2026-05-01",
        to: "2026-05-25",
      },
      "cursor-123"
    );

    expect(params.toString()).toBe(
      "sortBy=oldest&q=synthwave&dateFrom=2026-05-01&dateTo=2026-05-25&cursor=cursor-123"
    );
  });
});

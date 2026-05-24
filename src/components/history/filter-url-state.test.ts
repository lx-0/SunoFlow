import { describe, expect, it } from "vitest";
import {
  parseHistoryFilterUrlState,
  toGenerationsApiSearchParams,
  toHistoryFilterSearchParams,
  type HistoryFilterUrlState,
} from "./filter-url-state";

describe("history filter URL state", () => {
  it("parses defaults when params are absent", () => {
    const parsed = parseHistoryFilterUrlState(new URLSearchParams());
    expect(parsed).toEqual({
      status: "all",
      sort: "newest",
      q: "",
      from: "",
      to: "",
    });
  });

  it("normalizes unknown sort values to newest", () => {
    const parsed = parseHistoryFilterUrlState(new URLSearchParams("sort=random"));
    expect(parsed.sort).toBe("newest");
  });

  it("serializes only non-default URL params", () => {
    const state: HistoryFilterUrlState = {
      status: "ready",
      sort: "oldest",
      q: "chill",
      from: "2026-05-01",
      to: "2026-05-24",
    };

    const params = toHistoryFilterSearchParams(state);
    expect(params.toString()).toBe("status=ready&sort=oldest&q=chill&from=2026-05-01&to=2026-05-24");
  });

  it("builds generations API params with expected key mapping", () => {
    const state: HistoryFilterUrlState = {
      status: "failed",
      sort: "newest",
      q: "ambient",
      from: "2026-01-01",
      to: "2026-02-01",
    };

    const params = toGenerationsApiSearchParams(state, "next-1");
    expect(params.toString()).toBe("status=failed&sortBy=newest&q=ambient&dateFrom=2026-01-01&dateTo=2026-02-01&cursor=next-1");
  });
});

import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIBRARY_FILTER_URL_STATE,
  hasActiveLibraryFilters,
  parseLibraryFilterUrlState,
  toLibraryFilterSearchParams,
} from "./filter-url-state";

describe("library filter URL state", () => {
  it("parses search params with defaults and aliases", () => {
    const params = new URLSearchParams({
      q: "synthwave",
      status: "ready",
      minRating: "4",
      tagId: "tag-1,tag-2",
      genre: "electronic,pop",
      mood: "energetic",
      includeVariations: "true",
    });

    const parsed = parseLibraryFilterUrlState(params);

    expect(parsed.searchText).toBe("synthwave");
    expect(parsed.statusFilter).toBe("ready");
    expect(parsed.ratingFilter).toBe("4");
    expect(parsed.sortBy).toBe("newest");
    expect(parsed.tagFilter).toEqual(["tag-1", "tag-2"]);
    expect(parsed.genreFilter).toEqual(["electronic", "pop"]);
    expect(parsed.moodFilter).toEqual(["energetic"]);
    expect(parsed.includeVariations).toBe(true);
  });

  it("serializes only active filters", () => {
    const params = toLibraryFilterSearchParams({
      searchText: "lofi",
      statusFilter: "",
      ratingFilter: "",
      dateFrom: "",
      dateTo: "",
      sortBy: "oldest",
      tagFilter: ["a", "b"],
      smartFilter: "favorites",
      genreFilter: [],
      moodFilter: ["chill"],
      tempoMin: "80",
      tempoMax: "",
      includeVariations: false,
    });

    expect(params.toString()).toBe(
      "q=lofi&sortBy=oldest&tagIds=a%2Cb&smartFilter=favorites&mood=chill&tempoMin=80"
    );
  });

  it("returns stable defaults for empty search params", () => {
    const parsed = parseLibraryFilterUrlState(new URLSearchParams());
    expect(parsed).toEqual(DEFAULT_LIBRARY_FILTER_URL_STATE);
  });

  it("trims and filters empty CSV items", () => {
    const parsed = parseLibraryFilterUrlState(
      new URLSearchParams({
        tagIds: " tag-1, ,tag-2,, ",
        genre: " electronic, ,pop ",
      })
    );

    expect(parsed.tagFilter).toEqual(["tag-1", "tag-2"]);
    expect(parsed.genreFilter).toEqual(["electronic", "pop"]);
  });

  it("detects active filters with optional search/sort toggles", () => {
    expect(hasActiveLibraryFilters(DEFAULT_LIBRARY_FILTER_URL_STATE)).toBe(false);

    expect(
      hasActiveLibraryFilters({
        ...DEFAULT_LIBRARY_FILTER_URL_STATE,
        searchText: "lofi",
      })
    ).toBe(true);

    expect(
      hasActiveLibraryFilters(
        {
          ...DEFAULT_LIBRARY_FILTER_URL_STATE,
          searchText: "lofi",
        },
        { includeSearchText: false }
      )
    ).toBe(false);

    expect(
      hasActiveLibraryFilters({
        ...DEFAULT_LIBRARY_FILTER_URL_STATE,
        sortBy: "oldest",
      })
    ).toBe(true);

    expect(
      hasActiveLibraryFilters(
        {
          ...DEFAULT_LIBRARY_FILTER_URL_STATE,
          sortBy: "oldest",
        },
        { includeSortBy: false }
      )
    ).toBe(false);
  });
});

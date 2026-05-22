export interface LibraryFilterUrlState {
  searchText: string;
  statusFilter: string;
  ratingFilter: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  tagFilter: string[];
  smartFilter: string;
  genreFilter: string[];
  moodFilter: string[];
  tempoMin: string;
  tempoMax: string;
  includeVariations: boolean;
}

type SearchParamsLike = { get: (key: string) => string | null };

function parseCsvParam(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

export function parseLibraryFilterUrlState(searchParams: SearchParamsLike): LibraryFilterUrlState {
  const tagParam = searchParams.get("tagIds") ?? searchParams.get("tagId");
  return {
    searchText: searchParams.get("q") ?? "",
    statusFilter: searchParams.get("status") ?? "",
    ratingFilter: searchParams.get("minRating") ?? "",
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
    sortBy: searchParams.get("sortBy") ?? "newest",
    tagFilter: parseCsvParam(tagParam),
    smartFilter: searchParams.get("smartFilter") ?? "",
    genreFilter: parseCsvParam(searchParams.get("genre")),
    moodFilter: parseCsvParam(searchParams.get("mood")),
    tempoMin: searchParams.get("tempoMin") ?? "",
    tempoMax: searchParams.get("tempoMax") ?? "",
    includeVariations: searchParams.get("includeVariations") === "true",
  };
}

export function toLibraryFilterSearchParams(state: LibraryFilterUrlState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.searchText) params.set("q", state.searchText);
  if (state.statusFilter) params.set("status", state.statusFilter);
  if (state.ratingFilter) params.set("minRating", state.ratingFilter);
  if (state.dateFrom) params.set("dateFrom", state.dateFrom);
  if (state.dateTo) params.set("dateTo", state.dateTo);
  if (state.sortBy && state.sortBy !== "newest") params.set("sortBy", state.sortBy);
  if (state.tagFilter.length > 0) params.set("tagIds", state.tagFilter.join(","));
  if (state.smartFilter) params.set("smartFilter", state.smartFilter);
  if (state.genreFilter.length > 0) params.set("genre", state.genreFilter.join(","));
  if (state.moodFilter.length > 0) params.set("mood", state.moodFilter.join(","));
  if (state.tempoMin) params.set("tempoMin", state.tempoMin);
  if (state.tempoMax) params.set("tempoMax", state.tempoMax);
  if (state.includeVariations) params.set("includeVariations", "true");
  return params;
}

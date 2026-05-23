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
type ActiveFilterOptions = {
  includeSearchText?: boolean;
  includeSortBy?: boolean;
};

const URL_KEYS = {
  searchText: "q",
  statusFilter: "status",
  ratingFilter: "minRating",
  dateFrom: "dateFrom",
  dateTo: "dateTo",
  sortBy: "sortBy",
  tagFilter: "tagIds",
  tagFilterLegacy: "tagId",
  smartFilter: "smartFilter",
  genreFilter: "genre",
  moodFilter: "mood",
  tempoMin: "tempoMin",
  tempoMax: "tempoMax",
  includeVariations: "includeVariations",
} as const;

const DEFAULT_SORT = "newest";

export const DEFAULT_LIBRARY_FILTER_URL_STATE: LibraryFilterUrlState = {
  searchText: "",
  statusFilter: "",
  ratingFilter: "",
  dateFrom: "",
  dateTo: "",
  sortBy: DEFAULT_SORT,
  tagFilter: [],
  smartFilter: "",
  genreFilter: [],
  moodFilter: [],
  tempoMin: "",
  tempoMax: "",
  includeVariations: false,
};

function parseCsvParam(value: string | null): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export function parseLibraryFilterUrlState(searchParams: SearchParamsLike): LibraryFilterUrlState {
  const tagParam = searchParams.get(URL_KEYS.tagFilter) ?? searchParams.get(URL_KEYS.tagFilterLegacy);
  return {
    searchText: searchParams.get(URL_KEYS.searchText) ?? DEFAULT_LIBRARY_FILTER_URL_STATE.searchText,
    statusFilter: searchParams.get(URL_KEYS.statusFilter) ?? DEFAULT_LIBRARY_FILTER_URL_STATE.statusFilter,
    ratingFilter: searchParams.get(URL_KEYS.ratingFilter) ?? DEFAULT_LIBRARY_FILTER_URL_STATE.ratingFilter,
    dateFrom: searchParams.get(URL_KEYS.dateFrom) ?? DEFAULT_LIBRARY_FILTER_URL_STATE.dateFrom,
    dateTo: searchParams.get(URL_KEYS.dateTo) ?? DEFAULT_LIBRARY_FILTER_URL_STATE.dateTo,
    sortBy: searchParams.get(URL_KEYS.sortBy) ?? DEFAULT_SORT,
    tagFilter: parseCsvParam(tagParam),
    smartFilter: searchParams.get(URL_KEYS.smartFilter) ?? DEFAULT_LIBRARY_FILTER_URL_STATE.smartFilter,
    genreFilter: parseCsvParam(searchParams.get(URL_KEYS.genreFilter)),
    moodFilter: parseCsvParam(searchParams.get(URL_KEYS.moodFilter)),
    tempoMin: searchParams.get(URL_KEYS.tempoMin) ?? DEFAULT_LIBRARY_FILTER_URL_STATE.tempoMin,
    tempoMax: searchParams.get(URL_KEYS.tempoMax) ?? DEFAULT_LIBRARY_FILTER_URL_STATE.tempoMax,
    includeVariations: searchParams.get(URL_KEYS.includeVariations) === "true",
  };
}

export function toLibraryFilterSearchParams(state: LibraryFilterUrlState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.searchText) params.set(URL_KEYS.searchText, state.searchText);
  if (state.statusFilter) params.set(URL_KEYS.statusFilter, state.statusFilter);
  if (state.ratingFilter) params.set(URL_KEYS.ratingFilter, state.ratingFilter);
  if (state.dateFrom) params.set(URL_KEYS.dateFrom, state.dateFrom);
  if (state.dateTo) params.set(URL_KEYS.dateTo, state.dateTo);
  if (state.sortBy && state.sortBy !== DEFAULT_SORT) params.set(URL_KEYS.sortBy, state.sortBy);
  if (state.tagFilter.length > 0) params.set(URL_KEYS.tagFilter, state.tagFilter.join(","));
  if (state.smartFilter) params.set(URL_KEYS.smartFilter, state.smartFilter);
  if (state.genreFilter.length > 0) params.set(URL_KEYS.genreFilter, state.genreFilter.join(","));
  if (state.moodFilter.length > 0) params.set(URL_KEYS.moodFilter, state.moodFilter.join(","));
  if (state.tempoMin) params.set(URL_KEYS.tempoMin, state.tempoMin);
  if (state.tempoMax) params.set(URL_KEYS.tempoMax, state.tempoMax);
  if (state.includeVariations) params.set(URL_KEYS.includeVariations, "true");
  return params;
}

export function hasActiveLibraryFilters(
  state: LibraryFilterUrlState,
  options: ActiveFilterOptions = {}
): boolean {
  const includeSearchText = options.includeSearchText ?? true;
  const includeSortBy = options.includeSortBy ?? true;

  return Boolean(
    (includeSearchText && state.searchText) ||
      state.statusFilter ||
      state.ratingFilter ||
      state.dateFrom ||
      state.dateTo ||
      (includeSortBy && state.sortBy !== DEFAULT_SORT) ||
      state.tagFilter.length > 0 ||
      state.smartFilter ||
      state.genreFilter.length > 0 ||
      state.moodFilter.length > 0 ||
      state.tempoMin ||
      state.tempoMax ||
      state.includeVariations
  );
}

export type SearchParamsLike = Pick<URLSearchParams, "get">;

export type HistorySortKey = "newest" | "oldest";

export interface HistoryFilterUrlState {
  status: string;
  sort: HistorySortKey;
  q: string;
  from: string;
  to: string;
}

const DEFAULT_HISTORY_FILTER_URL_STATE: HistoryFilterUrlState = {
  status: "all",
  sort: "newest",
  q: "",
  from: "",
  to: "",
};

function parseSortKey(value: string | null): HistorySortKey {
  return value === "oldest" ? "oldest" : "newest";
}

export function parseHistoryFilterUrlState(searchParams: SearchParamsLike): HistoryFilterUrlState {
  return {
    status: searchParams.get("status") ?? DEFAULT_HISTORY_FILTER_URL_STATE.status,
    sort: parseSortKey(searchParams.get("sort")),
    q: searchParams.get("q") ?? DEFAULT_HISTORY_FILTER_URL_STATE.q,
    from: searchParams.get("from") ?? DEFAULT_HISTORY_FILTER_URL_STATE.from,
    to: searchParams.get("to") ?? DEFAULT_HISTORY_FILTER_URL_STATE.to,
  };
}

export function toHistoryFilterSearchParams(state: HistoryFilterUrlState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.status !== DEFAULT_HISTORY_FILTER_URL_STATE.status) params.set("status", state.status);
  if (state.sort !== DEFAULT_HISTORY_FILTER_URL_STATE.sort) params.set("sort", state.sort);
  if (state.q) params.set("q", state.q);
  if (state.from) params.set("from", state.from);
  if (state.to) params.set("to", state.to);
  return params;
}

export function toGenerationsApiSearchParams(state: HistoryFilterUrlState, cursor?: string): URLSearchParams {
  const params = new URLSearchParams();
  if (state.status !== DEFAULT_HISTORY_FILTER_URL_STATE.status) params.set("status", state.status);
  params.set("sortBy", state.sort);
  if (state.q) params.set("q", state.q);
  if (state.from) params.set("dateFrom", state.from);
  if (state.to) params.set("dateTo", state.to);
  if (cursor) params.set("cursor", cursor);
  return params;
}

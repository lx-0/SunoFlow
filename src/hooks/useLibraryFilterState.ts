"use client";

import { useEffect, useMemo, useReducer, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_LIBRARY_FILTER_URL_STATE,
  hasActiveLibraryFilters,
  parseLibraryFilterUrlState,
  toLibraryFilterSearchParams,
  type LibraryFilterUrlState,
} from "@/components/library/filter-url-state";
import { useDebounce } from "./useDebounce";

interface UseLibraryFilterStateOptions {
  enableServerSearch: boolean;
}

type FilterAction =
  | { type: "set"; key: keyof LibraryFilterUrlState; value: LibraryFilterUrlState[keyof LibraryFilterUrlState] }
  | { type: "reset" }
  | { type: "hydrate"; value: LibraryFilterUrlState };

function filterReducer(state: LibraryFilterUrlState, action: FilterAction): LibraryFilterUrlState {
  if (action.type === "reset") return DEFAULT_LIBRARY_FILTER_URL_STATE;
  if (action.type === "hydrate") return action.value;
  return { ...state, [action.key]: action.value };
}

/** Canonical query string for a filter state — the exact form the writer emits,
 *  so a URL and a state can be compared without ordering/unknown-param noise. */
function canonicalQuery(state: LibraryFilterUrlState): string {
  return toLibraryFilterSearchParams(state).toString();
}

export function useLibraryFilterState({ enableServerSearch }: UseLibraryFilterStateOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, dispatch] = useReducer(filterReducer, searchParams, parseLibraryFilterUrlState);

  const debouncedSearch = useDebounce(filters.searchText, 300);

  const currentFilterState = useMemo(
    () => ({ ...filters, searchText: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const hasAnyFilter = hasActiveLibraryFilters(currentFilterState);
  const hasActiveFilters = hasActiveLibraryFilters(currentFilterState, {
    includeSearchText: false,
    includeSortBy: false,
  });

  const urlQuery = useMemo(
    () => canonicalQuery(parseLibraryFilterUrlState(searchParams)),
    [searchParams],
  );
  const stateQuery = useMemo(() => canonicalQuery(currentFilterState), [currentFilterState]);

  // Last query this hook itself put into — or adopted from — the URL. Lets the
  // sync effect tell "the user changed a filter" from "the URL changed under
  // us" (back/forward, a Link to the same route with a different query, an
  // external router.replace) and pick the direction accordingly.
  const syncedQueryRef = useRef(urlQuery);

  // searchText is debounced so typing doesn't write a history entry per
  // keystroke; while it is still settling, state and URL legitimately disagree
  // and must not be pushed. Non-search filters settle immediately.
  const searchSettled = debouncedSearch === filters.searchText;

  useEffect(() => {
    if (!enableServerSearch) return;

    // Pull: the URL moved on its own — adopt it. Without this the reducer kept
    // its mount-time seed forever, so a same-route query navigation silently
    // did nothing and the push below wrote the stale filters straight back out.
    if (urlQuery !== syncedQueryRef.current) {
      syncedQueryRef.current = urlQuery;
      dispatch({ type: "hydrate", value: parseLibraryFilterUrlState(searchParams) });
      return;
    }

    // Push: the filter state is the source of truth — mirror it into the URL.
    if (searchSettled && stateQuery !== urlQuery) {
      syncedQueryRef.current = stateQuery;
      router.replace(stateQuery ? `${pathname}?${stateQuery}` : pathname, { scroll: false });
    }
  }, [urlQuery, stateQuery, searchSettled, searchParams, enableServerSearch, pathname, router]);

  function setFilter<K extends keyof LibraryFilterUrlState>(
    key: K,
    value: LibraryFilterUrlState[K],
  ) {
    dispatch({ type: "set", key, value });
  }

  function clearAllFilters() {
    dispatch({ type: "reset" });
  }

  return {
    filters,
    debouncedSearch,
    setFilter,
    clearAllFilters,
    hasAnyFilter,
    hasActiveFilters,
    currentFilterState,
  };
}

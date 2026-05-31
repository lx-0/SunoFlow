"use client";

import { useEffect, useMemo, useReducer } from "react";
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
  | { type: "reset" };

function filterReducer(state: LibraryFilterUrlState, action: FilterAction): LibraryFilterUrlState {
  if (action.type === "reset") return DEFAULT_LIBRARY_FILTER_URL_STATE;
  return { ...state, [action.key]: action.value };
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

  useEffect(() => {
    if (!enableServerSearch) return;
    const params = toLibraryFilterSearchParams(currentFilterState);
    const qs = params.toString();
    const newUrl = qs ? `${pathname}?${qs}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [currentFilterState, enableServerSearch, pathname, router]);

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

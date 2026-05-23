"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  hasActiveLibraryFilters,
  parseLibraryFilterUrlState,
  toLibraryFilterSearchParams,
} from "@/components/library/filter-url-state";
import { useDebounce } from "./useDebounce";

interface UseLibraryFilterStateOptions {
  enableServerSearch: boolean;
}

export function useLibraryFilterState({ enableServerSearch }: UseLibraryFilterStateOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialFilterState = parseLibraryFilterUrlState(searchParams);

  const [searchText, setSearchText] = useState(initialFilterState.searchText);
  const [statusFilter, setStatusFilter] = useState(initialFilterState.statusFilter);
  const [ratingFilter, setRatingFilter] = useState(initialFilterState.ratingFilter);
  const [dateFrom, setDateFrom] = useState(initialFilterState.dateFrom);
  const [dateTo, setDateTo] = useState(initialFilterState.dateTo);
  const [sortBy, setSortBy] = useState(initialFilterState.sortBy);
  const [tagFilter, setTagFilter] = useState<string[]>(initialFilterState.tagFilter);
  const [smartFilter, setSmartFilter] = useState(initialFilterState.smartFilter);
  const [genreFilter, setGenreFilter] = useState<string[]>(initialFilterState.genreFilter);
  const [moodFilter, setMoodFilter] = useState<string[]>(initialFilterState.moodFilter);
  const [tempoMin, setTempoMin] = useState(initialFilterState.tempoMin);
  const [tempoMax, setTempoMax] = useState(initialFilterState.tempoMax);
  const [includeVariations, setIncludeVariations] = useState(initialFilterState.includeVariations);
  const debouncedSearch = useDebounce(searchText, 300);

  const currentFilterState = useMemo(
    () => ({
      searchText: debouncedSearch,
      statusFilter,
      ratingFilter,
      dateFrom,
      dateTo,
      sortBy,
      tagFilter,
      smartFilter,
      genreFilter,
      moodFilter,
      tempoMin,
      tempoMax,
      includeVariations,
    }),
    [
      debouncedSearch,
      statusFilter,
      ratingFilter,
      dateFrom,
      dateTo,
      sortBy,
      tagFilter,
      smartFilter,
      genreFilter,
      moodFilter,
      tempoMin,
      tempoMax,
      includeVariations,
    ]
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

  function clearAllFilters() {
    setSearchText("");
    setStatusFilter("");
    setRatingFilter("");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
    setTagFilter([]);
    setSmartFilter("");
    setGenreFilter([]);
    setMoodFilter([]);
    setTempoMin("");
    setTempoMax("");
    setIncludeVariations(false);
  }

  return {
    searchText,
    debouncedSearch,
    setSearchText,
    statusFilter,
    setStatusFilter,
    ratingFilter,
    setRatingFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sortBy,
    setSortBy,
    tagFilter,
    setTagFilter,
    smartFilter,
    setSmartFilter,
    genreFilter,
    setGenreFilter,
    moodFilter,
    setMoodFilter,
    tempoMin,
    setTempoMin,
    tempoMax,
    setTempoMax,
    includeVariations,
    setIncludeVariations,
    currentFilterState,
    hasAnyFilter,
    hasActiveFilters,
    clearAllFilters,
  };
}

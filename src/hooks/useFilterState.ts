"use client";

import { useCallback, useState } from "react";

/**
 * Manages a set of string filter values with derived filterCount and clearFilters.
 * Used by discover hooks to eliminate repeated boilerplate.
 */
export function useFilterState<K extends string>(
  initial: Record<K, string>
): {
  values: Record<K, string>;
  set: (key: K, value: string) => void;
  clearFilters: () => void;
  filterCount: number;
} {
  const [values, setValues] = useState<Record<K, string>>(initial);

  const set = useCallback((key: K, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setValues((prev) =>
      Object.fromEntries(Object.keys(prev).map((k) => [k, ""])) as Record<K, string>
    );
  }, []);

  const filterCount = (Object.values(values) as string[]).filter(Boolean).length;

  return { values, set, clearFilters, filterCount };
}

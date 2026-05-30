"use client";

import React, { useCallback, useRef, useState } from "react";

/**
 * Wraps an async boolean-toggle function with optimistic state and automatic
 * rollback on failure. Returns [wrappedFn, currentValue, isLoading, setValue].
 * setValue is exposed so callers can sync external state (e.g. from an API fetch).
 */
export function useOptimisticToggle(
  initialValue: boolean,
  fn: (newValue: boolean) => Promise<void>,
): [() => Promise<void>, boolean, boolean, React.Dispatch<React.SetStateAction<boolean>>] {
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const execute = useCallback(async () => {
    if (isLoading) return;
    const prev = value;
    const next = !prev;
    setValue(next);
    setIsLoading(true);
    try {
      await fnRef.current(next);
    } catch {
      setValue(prev);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, value]);

  return [execute, value, isLoading, setValue];
}

"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Wraps an async function with loading-state management and double-submission guard.
 * Returns [wrappedFn, isLoading].
 */
export function useAsyncAction<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<void>,
): [(...args: TArgs) => Promise<void>, boolean] {
  const [isLoading, setIsLoading] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const execute = useCallback(
    async (...args: TArgs) => {
      if (isLoading) return;
      setIsLoading(true);
      try {
        await fnRef.current(...args);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading],
  );

  return [execute, isLoading];
}

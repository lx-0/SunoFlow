"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Like useAsyncAction but surfaces a string error and double-submission guard.
 * Designed for form onSubmit handlers that display inline error messages.
 * Returns { execute, submitting, error, clearError }.
 */
export function useAsyncForm<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<void>,
): {
  execute: (...args: TArgs) => Promise<void>;
  submitting: boolean;
  error: string | null;
  clearError: () => void;
} {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const clearError = useCallback(() => setError(null), []);

  const execute = useCallback(
    async (...args: TArgs) => {
      if (submitting) return;
      setSubmitting(true);
      setError(null);
      try {
        await fnRef.current(...args);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setSubmitting(false);
      }
    },
    [submitting],
  );

  return { execute, submitting, error, clearError };
}

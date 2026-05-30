/**
 * Runs a fetch inside a useEffect and returns a cleanup function that prevents
 * stale state updates after the effect is torn down.
 *
 * Usage:
 *   useEffect(() => fetchEffect('/api/foo', (data) => setFoo(data.foo)), [dep]);
 *   useEffect(() => fetchEffect('/api/bar', (data) => setBar(data), () => setLoading(false)), [dep]);
 */
export function fetchEffect<T>(
  url: string,
  onSuccess: (data: T) => void,
  onSettled?: () => void,
): () => void {
  let cancelled = false;
  fetch(url)
    .then((res) => (res.ok ? (res.json() as Promise<T>) : null))
    .then((data) => {
      if (!cancelled && data != null) onSuccess(data);
    })
    .catch(() => {})
    .finally(() => {
      if (!cancelled) onSettled?.();
    });
  return () => {
    cancelled = true;
  };
}

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api-client";

interface ApiGetResult<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

export function useApiGet<T>(url: string): ApiGetResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    apiGet<T>(url)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}

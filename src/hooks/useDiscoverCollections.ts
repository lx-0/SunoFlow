"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CollectionPreview } from "@/app/[locale]/discover/discover-view.types";
import { apiGet } from "@/lib/api-client";

export function useDiscoverCollections({ active }: { active: boolean }) {
  const [collections, setCollections] = useState<CollectionPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchedRef = useRef(false);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ collections: CollectionPreview[] }>("/api/collections");
      setCollections(data.collections ?? []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchCollections();
  }, [active, fetchCollections]);

  return { collections, loading, error };
}

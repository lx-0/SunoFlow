"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CollectionPreview } from "./discover-view.types";

export function useDiscoverCollections(active: boolean) {
  const [collections, setCollections] = useState<CollectionPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/collections");
      if (!res.ok) return;
      const data = await res.json();
      setCollections(data.collections ?? []);
    } catch {
      // keep existing state
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

  return { collections, loading };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CollectionPreview } from "@/app/[locale]/discover/discover-view.types";
import { apiGet } from "@/lib/api-client";

export function useDiscoverCollections({ active }: { active: boolean }) {
  const [collections, setCollections] = useState<CollectionPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ collections: CollectionPreview[] }>("/api/collections");
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

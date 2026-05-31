"use client";

import { useState, useCallback } from "react";
import { apiGet } from "@/lib/api-client";

export interface PlaylistActivityItem {
  id: string;
  type: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    avatarUrl: string | null;
    username?: string | null;
  } | null;
  song: {
    id: string;
    title: string | null;
    imageUrl: string | null;
  } | null;
}

interface UsePlaylistActivityOptions {
  playlistId: string;
}

export function usePlaylistActivity({
  playlistId,
}: UsePlaylistActivityOptions) {
  const [activities, setActivities] = useState<PlaylistActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);

  const handleLoadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const data = await apiGet<{ activities?: PlaylistActivityItem[] } | PlaylistActivityItem[]>(`/api/playlists/${playlistId}/activity`);
      setActivities((Array.isArray(data) ? data : data.activities) ?? []);
    } catch {
      // ignore
    } finally {
      setActivityLoading(false);
    }
  }, [playlistId]);

  const handleToggleActivityFeed = useCallback(async () => {
    if (!showActivityFeed && activities.length === 0) {
      await handleLoadActivity();
    }
    setShowActivityFeed((v) => !v);
  }, [showActivityFeed, activities.length, handleLoadActivity]);

  return {
    activities,
    activityLoading,
    showActivityFeed,
    handleToggleActivityFeed,
  };
}

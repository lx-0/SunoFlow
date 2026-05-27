"use client";

import { useState } from "react";

interface CollaboratorUser {
  id: string;
  name: string | null;
  image: string | null;
  avatarUrl: string | null;
}

interface PlaylistActivityItem {
  id: string;
  type: string;
  createdAt: string;
  user: CollaboratorUser | null;
  song: { id: string; title: string | null; imageUrl: string | null } | null;
}

export function usePlaylistActivity(playlistId: string) {
  const [activities, setActivities] = useState<PlaylistActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);

  async function handleLoadActivity() {
    if (activityLoading) return;
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/activity`);
      if (!res.ok) return;
      const data = await res.json();
      setActivities(data.activities ?? []);
    } catch {
      // non-fatal
    } finally {
      setActivityLoading(false);
    }
  }

  function handleToggleActivityFeed() {
    if (!showActivityFeed && activities.length === 0) {
      handleLoadActivity();
    }
    setShowActivityFeed((prev) => !prev);
  }

  return {
    activities,
    activityLoading,
    showActivityFeed,
    handleToggleActivityFeed,
  };
}

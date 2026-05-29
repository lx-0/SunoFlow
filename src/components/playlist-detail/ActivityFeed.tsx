"use client";

import Image from "next/image";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import type { PlaylistActivityItem } from "@/hooks/usePlaylistActivity";

interface ActivityFeedProps {
  activity: {
    showActivityFeed: boolean;
    activityLoading: boolean;
    activities: PlaylistActivityItem[];
    handleToggleActivityFeed: () => void;
  };
  isCollaborative: boolean;
}

export function ActivityFeed({ activity, isCollaborative }: ActivityFeedProps) {
  if (!isCollaborative) return null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={activity.handleToggleActivityFeed}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="flex items-center gap-2">
          <UserGroupIcon className="w-4 h-4 text-violet-500" />
          Activity feed
        </span>
        <span className="text-xs text-gray-400">{activity.showActivityFeed ? "▲" : "▼"}</span>
      </button>

      {activity.showActivityFeed && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 space-y-3">
          {activity.activityLoading ? (
            <p className="text-xs text-gray-400 text-center py-2">Loading…</p>
          ) : activity.activities.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">No activity yet. Start adding songs!</p>
          ) : (
            activity.activities.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-xs font-medium text-violet-700 dark:text-violet-300 overflow-hidden flex-shrink-0 mt-0.5">
                  {(a.user?.avatarUrl ?? a.user?.image) ? (
                    <Image
                      src={(a.user?.avatarUrl ?? a.user?.image)!}
                      alt={a.user?.name ?? "User"}
                      width={28}
                      height={28}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    (a.user?.name?.[0] ?? "?").toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{a.user?.name ?? "Someone"}</span>
                    {" "}
                    {a.type === "song_added_to_playlist" ? "added" : "removed"}
                    {" "}
                    <span className="font-medium">{a.song?.title ?? "a song"}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

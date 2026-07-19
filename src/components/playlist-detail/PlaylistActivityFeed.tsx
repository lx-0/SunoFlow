"use client";

import Image from "next/image";
import { UsersRound } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import type { PlaylistActivityItem } from "./types";

interface PlaylistActivityFeedProps {
  activities: PlaylistActivityItem[];
  activityLoading: boolean;
  showActivityFeed: boolean;
  onToggle: () => void;
}

export function PlaylistActivityFeed({
  activities,
  activityLoading,
  showActivityFeed,
  onToggle,
}: PlaylistActivityFeedProps) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-primary hover:bg-surface-hover transition-colors"
      >
        <span className="flex items-center gap-2">
          <Icon icon={UsersRound} className="w-4 h-4 text-violet-500" />
          Activity feed
        </span>
        <span className="text-xs text-muted">{showActivityFeed ? "▲" : "▼"}</span>
      </button>

      {showActivityFeed && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {activityLoading ? (
            <p className="text-xs text-muted text-center py-2">Loading...</p>
          ) : activities.length === 0 ? (
            <p className="text-xs text-muted text-center py-2">No activity yet. Start adding songs!</p>
          ) : (
            activities.map((a) => (
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
                  <p className="text-xs text-primary">
                    <span className="font-medium">{a.user?.name ?? "Someone"}</span>
                    {" "}
                    {a.type === "song_added_to_playlist" ? "added" : "removed"}
                    {" "}
                    <span className="font-medium">{a.song?.title ?? "a song"}</span>
                  </p>
                  <p className="text-xs text-muted mt-0.5">
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

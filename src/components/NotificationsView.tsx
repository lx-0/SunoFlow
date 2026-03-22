"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  MegaphoneIcon,
  BellIcon,
} from "@heroicons/react/24/outline";
import {
  useNotifications,
  type NotificationType,
} from "./NotificationContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const typeIcons: Record<NotificationType, typeof CheckCircleIcon> = {
  generation_complete: CheckCircleIcon,
  generation_failed: ExclamationCircleIcon,
  rate_limit_reset: ClockIcon,
  announcement: MegaphoneIcon,
};

const typeColors: Record<NotificationType, string> = {
  generation_complete: "text-green-500",
  generation_failed: "text-red-500",
  rate_limit_reset: "text-amber-500",
  announcement: "text-violet-500",
};

const typeLabels: Record<NotificationType, string> = {
  generation_complete: "Complete",
  generation_failed: "Failed",
  rate_limit_reset: "Rate limit",
  announcement: "Announcement",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  href?: string | null;
  songId?: string | null;
}

interface Props {
  initialNotifications: NotificationItem[];
  initialNextCursor: string | null;
  initialTotal: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationsView({
  initialNotifications,
  initialNextCursor,
  initialTotal,
}: Props) {
  const router = useRouter();
  const { markAsRead, markAllAsRead, browserPermission, requestBrowserPermission } =
    useNotifications();
  const [items, setItems] = useState<NotificationItem[]>(initialNotifications);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [total] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/notifications?limit=20&cursor=${nextCursor}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setItems((prev) => [...prev, ...(data.notifications ?? [])]);
      setNextCursor(data.nextCursor ?? null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading]);

  const handleClick = useCallback(
    (item: NotificationItem) => {
      if (!item.read) markAsRead(item.id);
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
      if (item.href) router.push(item.href);
    },
    [markAsRead, router]
  );

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [markAllAsRead]);

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Notifications
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {total} total notification{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {browserPermission !== "granted" && (
            <button
              onClick={requestBrowserPermission}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Enable browser notifications
            </button>
          )}
          <button
            onClick={handleMarkAllRead}
            className="text-xs px-3 py-1.5 rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition-colors font-medium"
          >
            Mark all read
          </button>
        </div>
      </div>

      {/* Notification list */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
          <BellIcon className="w-12 h-12 mb-3" />
          <p className="text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const Icon =
              typeIcons[item.type as NotificationType] ?? BellIcon;
            const color =
              typeColors[item.type as NotificationType] ?? "text-gray-500";
            const label =
              typeLabels[item.type as NotificationType] ?? item.type;

            return (
              <button
                key={item.id}
                onClick={() => handleClick(item)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                  !item.read
                    ? "bg-violet-50/50 dark:bg-violet-900/10"
                    : ""
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color}`}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm ${
                        !item.read
                          ? "font-semibold text-gray-900 dark:text-white"
                          : "font-medium text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {item.title}
                    </p>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${color} bg-opacity-10`}
                    >
                      {label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.message}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    {relativeTime(item.createdAt)}
                  </p>
                </div>
                {!item.read && (
                  <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 mt-2" />
                )}
              </button>
            );
          })}

          {/* Load more */}
          {nextCursor && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMore}
                disabled={loading}
                className="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

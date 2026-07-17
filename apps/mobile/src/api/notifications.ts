import { asBool, asNumber, asRecord, asString } from "@sunoflow/core";
import { apiGet, apiPatch } from "@/api/client";

// Notifications feed. Shape from the web app's GET /api/notifications:
//   { notifications: Notification[], nextCursor, unreadCount }
// Each row: { id, type, title, message, href, songId, read, createdAt }.
// Mark-read: PATCH /api/notifications/{id}/read and /api/notifications/read-all.

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  songId: string | null;
  read: boolean;
  createdAt: string | null;
};

export type NotificationsResult = {
  notifications: AppNotification[];
  unreadCount: number;
};

function mapNotification(raw: unknown): AppNotification | null {
  const r = asRecord(raw);
  const id = r ? asString(r.id) : null;
  if (!r || !id) return null;
  return {
    id,
    type: asString(r.type, ""),
    title: asString(r.title, ""),
    message: asString(r.message, ""),
    href: asString(r.href),
    songId: asString(r.songId),
    read: asBool(r.read),
    createdAt: asString(r.createdAt),
  };
}

// Map a notification's web href (+ songId) to the equivalent in-app route, so a
// tapped notification navigates instead of dead-ending. Web paths differ from the
// mobile route tree (e.g. /songs/<id> → /song/<id>), so translate explicitly.
// Returns null when there's no sensible native target.
export function notificationTarget(n: AppNotification): string | null {
  const href = n.href ?? "";
  let m: RegExpMatchArray | null;
  if ((m = href.match(/^\/playlists\/invite\/([^/?#]+)/))) return `/playlist-invite/${m[1]}`;
  if ((m = href.match(/^\/playlists?\/([^/?#]+)/))) return `/playlist/${m[1]}`;
  if ((m = href.match(/^\/songs?\/([^/?#]+)/))) return `/song/${m[1]}`;
  if (n.songId) return `/song/${n.songId}`;
  if ((m = href.match(/^\/u\/([^/?#]+)/))) return `/u/${m[1]}`;
  if (href === "/profile") return "/profile";
  if (href === "/analytics") return "/insights";
  if (href === "/feed") return "/feed";
  return null;
}

export async function fetchNotifications(): Promise<NotificationsResult> {
  const res = await apiGet<unknown>("/api/notifications");
  const obj = asRecord(res) ?? {};
  const list = Array.isArray(obj.notifications) ? obj.notifications : [];
  const notifications = list
    .map(mapNotification)
    .filter((n): n is AppNotification => n !== null);
  const unreadCount =
    asNumber(obj.unreadCount) ?? notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount };
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiPatch<unknown>(`/api/notifications/${encodeURIComponent(id)}/read`, {});
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiPatch<unknown>("/api/notifications/read-all", {});
}

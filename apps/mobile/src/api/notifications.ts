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

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function mapNotification(raw: unknown): AppNotification | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = asString(r.id);
  if (!id) return null;
  return {
    id,
    type: asString(r.type),
    title: asString(r.title),
    message: asString(r.message),
    href: typeof r.href === "string" ? r.href : null,
    songId: typeof r.songId === "string" ? r.songId : null,
    read: r.read === true,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : null,
  };
}

export async function fetchNotifications(): Promise<NotificationsResult> {
  const res = await apiGet<unknown>("/api/notifications");
  const obj = res && typeof res === "object" ? (res as Record<string, unknown>) : {};
  const list = Array.isArray(obj.notifications) ? obj.notifications : [];
  const notifications = list
    .map(mapNotification)
    .filter((n): n is AppNotification => n !== null);
  const unreadCount =
    typeof obj.unreadCount === "number"
      ? obj.unreadCount
      : notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount };
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiPatch<unknown>(`/api/notifications/${encodeURIComponent(id)}/read`, {});
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiPatch<unknown>("/api/notifications/read-all", {});
}

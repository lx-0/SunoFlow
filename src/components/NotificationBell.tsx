"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  CircleCheck,
  CircleAlert,
  Clock,
  Megaphone,
  Download,
  CircleDollarSign,
  CreditCard,
  MessageSquare,
  UserPlus,
  Music,
  BellRing,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import {
  useNotifications,
  type NotificationType,
} from "./NotificationContext";
import { useOutsideClick } from "@/hooks/useOutsideClick";

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

const typeIcons: Record<NotificationType, LucideIcon> = {
  generation_complete: CircleCheck,
  generation_failed: CircleAlert,
  import_complete: Download,
  error: CircleAlert,
  rate_limit_reset: Clock,
  announcement: Megaphone,
  credit_update: CircleDollarSign,
  payment_failed: CreditCard,
  song_comment: MessageSquare,
  new_follower: UserPlus,
  playlist_invite: Music,
};

const typeColors: Record<NotificationType, string> = {
  generation_complete: "text-green-500",
  generation_failed: "text-red-500",
  import_complete: "text-blue-500",
  error: "text-red-500",
  rate_limit_reset: "text-amber-500",
  announcement: "text-violet-500",
  credit_update: "text-emerald-500",
  payment_failed: "text-red-500",
  song_comment: "text-sky-500",
  new_follower: "text-pink-500",
  playlist_invite: "text-indigo-500",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const outsideClickRefs = useMemo(() => [panelRef, buttonRef], []);
  const router = useRouter();

  useOutsideClick(outsideClickRefs, () => setOpen(false), open);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleNotificationClick = useCallback(
    (id: string, href?: string) => {
      markAsRead(id);
      if (href) {
        router.push(href);
        setOpen(false);
      }
    },
    [markAsRead, router]
  );

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-secondary hover:text-primary transition-colors relative"
      >
        {unreadCount > 0 ? (
          <Icon icon={BellRing} fill="currentColor" className="w-5 h-5 text-violet-500" />
        ) : (
          <Icon icon={Bell} className="w-5 h-5" />
        )}
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-violet-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="absolute right-0 top-full mt-2 w-80 max-h-[28rem] overflow-y-auto bg-surface border border-border rounded-xl shadow-xl z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-primary">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">
              No notifications yet
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const ItemIcon = typeIcons[n.type];
                const color = typeColors[n.type];
                return (
                  <li key={n.id}>
                    <button
                      role="menuitem"
                      onClick={() => handleNotificationClick(n.id, n.href)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        !n.read
                          ? "bg-violet-50/50 dark:bg-violet-900/10"
                          : ""
                      }`}
                    >
                      <Icon
                        icon={ItemIcon}
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color}`}
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${
                            !n.read
                              ? "font-semibold text-primary"
                              : "font-medium text-secondary"
                          }`}
                        >
                          {n.title}
                        </p>
                        <p className="text-xs text-secondary mt-0.5 truncate">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-muted mt-1">
                          {relativeTime(n.createdAt)}
                        </p>
                      </div>
                      {!n.read && (
                        <span aria-hidden="true" className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 mt-2" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* View all link */}
          <div className="border-t border-border px-4 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

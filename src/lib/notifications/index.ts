import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/event-bus";
import { invalidateByPrefix, cacheKey } from "@/lib/cache";
import { NOTIFICATION_CHANNELS } from "@/lib/notifications/channels";
import { type NotificationType } from "@/lib/notifications/types";
import {
  buildPreferenceSelect,
  fetchUserPreferences,
  dispatchPush,
  dispatchEmail,
} from "@/lib/notifications/delivery";

export type CreateNotificationParams = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  href?: string | null;
  songId?: string | null;
};

export type NotifyUserParams = CreateNotificationParams & {
  push?: { tag?: string } | false;
  email?: false;
};

function invalidateUnreadCache(userId: string) {
  invalidateByPrefix(cacheKey("notifications-unread", userId));
}

export async function createNotification(params: CreateNotificationParams) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      href: params.href ?? null,
      songId: params.songId ?? null,
    },
  });

  invalidateUnreadCache(params.userId);

  broadcast(params.userId, {
    type: "notification",
    data: {
      id: notification.id,
      type: params.type,
      title: params.title,
      message: params.message,
      href: params.href ?? null,
      songId: params.songId ?? null,
    },
  });

  return notification;
}

/**
 * Persist notification + broadcast SSE + send push + send email
 * (each channel gated by the user's preference).
 *
 * Channel selection is driven by NOTIFICATION_CHANNELS — adding a new
 * type's push/email behavior happens there, not here.
 */
export async function notifyUser(params: NotifyUserParams) {
  const notification = await createNotification(params);
  const channels = NOTIFICATION_CHANNELS[params.type];

  const wantPush = params.push !== false && !!channels.push;
  const wantEmail = params.email !== false && !!channels.email;
  if (!wantPush && !wantEmail) return notification;

  const userPrefs = await fetchUserPreferences(
    params.userId,
    buildPreferenceSelect(channels, wantPush, wantEmail),
  );
  if (!userPrefs) return notification;

  if (wantPush) {
    dispatchPush(params, channels, userPrefs);
  }

  if (wantEmail) {
    await dispatchEmail(params, channels, userPrefs);
  }

  return notification;
}

const LOW_CREDIT_THRESHOLD_TYPE: NotificationType = "low_credits";

export async function notifyLowCreditsIfNeeded(
  userId: string,
  usage: { isLow: boolean; creditsRemaining: number; budget: number },
): Promise<void> {
  if (!usage.isLow) return;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      type: LOW_CREDIT_THRESHOLD_TYPE,
      createdAt: { gte: startOfMonth },
    },
  });

  if (existing) return;

  await createNotification({
    userId,
    type: LOW_CREDIT_THRESHOLD_TYPE,
    title: "Low Credits Warning",
    message: `You have approximately ${usage.creditsRemaining} credits remaining this month (out of ${usage.budget}). Consider reducing usage to avoid running out.`,
    href: "/analytics",
  });
}

export async function markRead(
  userId: string,
  notificationId: string
): Promise<{ ok: boolean; notFound?: boolean }> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    return { ok: false, notFound: true };
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });

  invalidateUnreadCache(userId);
  return { ok: true };
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });

  invalidateUnreadCache(userId);
}

export async function notifyFollowersOfNewSong(creatorId: string, songId: string): Promise<void> {
  const [song, creator, followers] = await Promise.all([
    prisma.song.findUnique({
      where: { id: songId },
      select: { title: true, publicSlug: true, isPublic: true, isHidden: true, archivedAt: true },
    }),
    prisma.user.findUnique({
      where: { id: creatorId },
      select: { name: true, username: true },
    }),
    prisma.follow.findMany({
      where: { followingId: creatorId },
      select: { followerId: true },
    }),
  ]);

  if (!song || !song.isPublic || song.isHidden || song.archivedAt) return;
  if (followers.length === 0) return;

  const creatorName = creator?.name ?? creator?.username ?? "Someone";
  const songTitle = song.title ?? "Untitled";
  const href = song.publicSlug ? `/s/${song.publicSlug}` : null;

  await Promise.allSettled(
    followers.map(({ followerId }) =>
      createNotification({
        userId: followerId,
        type: "new_song_from_following",
        title: "New song from someone you follow",
        message: `${creatorName} published "${songTitle}"`,
        href: href ?? null,
        songId,
      })
    )
  );
}

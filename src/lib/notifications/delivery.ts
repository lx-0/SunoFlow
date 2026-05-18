import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { logger } from "@/lib/logger";
import { type NotificationChannels } from "@/lib/notifications/channels";
import { type NotifyUserParams } from "@/lib/notifications";

export type NotificationUserPrefs = Record<string, unknown>;

export function buildPreferenceSelect(
  channels: NotificationChannels,
  wantPush: boolean,
  wantEmail: boolean,
): Record<string, boolean> {
  const selectFields: Record<string, boolean> = {};
  if (wantPush && channels.push) selectFields[channels.push.prefField] = true;
  if (wantEmail && channels.email) {
    selectFields[channels.email.prefField] = true;
    selectFields.email = true;
    selectFields.unsubscribeToken = true;
  }
  return selectFields;
}

export async function fetchUserPreferences(
  userId: string,
  selectFields: Record<string, boolean>,
): Promise<NotificationUserPrefs | null> {
  try {
    return (await prisma.user.findUnique({
      where: { id: userId },
      select: selectFields,
    })) as NotificationUserPrefs | null;
  } catch (err) {
    logger.error({ err, userId }, "notifyUser: failed to fetch user preferences");
    return null;
  }
}

export function dispatchPush(
  params: NotifyUserParams,
  channels: NotificationChannels,
  userPrefs: NotificationUserPrefs | null,
): void {
  if (!channels.push) return;
  const pushAllowed = userPrefs?.[channels.push.prefField] !== false;
  if (!pushAllowed) return;

  sendPushToUser(params.userId, {
    title: params.title,
    body: params.message,
    url: params.href ?? "/",
    tag: typeof params.push === "object" ? params.push.tag : undefined,
  }).catch(() => {});
}

async function ensureUnsubscribeToken(userId: string, existingToken: string | null): Promise<string> {
  if (existingToken) return existingToken;

  const freshToken = crypto.randomUUID();
  await prisma.user
    .update({
      where: { id: userId },
      data: { unsubscribeToken: freshToken },
    })
    .catch(() => {});

  return freshToken;
}

export async function dispatchEmail(
  params: NotifyUserParams,
  channels: NotificationChannels,
  userPrefs: NotificationUserPrefs | null,
): Promise<void> {
  if (!channels.email || !userPrefs?.email) return;

  const emailAllowed = userPrefs[channels.email.prefField] !== false;
  if (!emailAllowed) return;

  const email = userPrefs.email as string;
  const unsubscribeToken = await ensureUnsubscribeToken(
    params.userId,
    (userPrefs.unsubscribeToken as string | null) ?? null,
  );

  channels.email
    .send({ songId: params.songId, title: params.title, message: params.message }, email, unsubscribeToken)
    .catch((err) =>
      logger.error(
        { userId: params.userId, type: params.type, err },
        "notifyUser: email send failed",
      ),
    );
}

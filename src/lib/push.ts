/**
 * Web Push notification sending utility.
 * Uses VAPID keys from environment variables.
 *
 * Required env vars:
 *   VAPID_PUBLIC_KEY   — base64url-encoded VAPID public key
 *   VAPID_PRIVATE_KEY  — base64url-encoded VAPID private key
 *   VAPID_SUBJECT      — mailto: or https: contact URI
 */

import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type PushPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  /** URL to open when notification is clicked */
  url?: string;
  tag?: string;
};

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:noreply@sunoflow.app";

  if (!publicKey || !privateKey) {
    logger.warn("VAPID keys not configured — push notifications disabled");
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

/**
 * Send a push notification to all subscriptions for a user.
 * Invalid/expired subscriptions are automatically cleaned up.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  ensureVapid();
  if (!vapidConfigured) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) return;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? "/icon-192x192.png",
    badge: payload.badge ?? "/icon-192x192.png",
    url: payload.url ?? "/",
    tag: payload.tag,
  });

  const staleIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404 or 410 means the subscription is no longer valid
        if (status === 404 || status === 410) {
          staleIds.push(sub.id);
        } else {
          logger.error({ userId, endpoint: sub.endpoint, err }, "push: send error");
        }
      }
    })
  );

  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
  }
}

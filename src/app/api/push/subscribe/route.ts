import { z } from "zod";
import { authRoute, successResponse } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";

const subscribeBody = z.object({
  endpoint: z.string().min(1),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

const unsubscribeBody = z.object({
  endpoint: z.string().min(1, "endpoint is required"),
});

// POST /api/push/subscribe — save or refresh a push subscription
export const POST = authRoute(async (_request, { auth, body }) => {
  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    update: { userId: auth.userId, p256dh: body.keys.p256dh, auth: body.keys.auth },
    create: { userId: auth.userId, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth },
  });

  return successResponse(201);
}, { route: "/api/push/subscribe", body: subscribeBody });

// DELETE /api/push/subscribe — remove a push subscription
export const DELETE = authRoute(async (_request, { auth, body }) => {
  await prisma.pushSubscription.deleteMany({
    where: { userId: auth.userId, endpoint: body.endpoint },
  });

  return successResponse();
}, { route: "/api/push/subscribe", body: unsubscribeBody });

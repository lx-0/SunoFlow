import { z } from "zod";
import { NextResponse } from "next/server";
import { authDataRoute, authRoute } from "@/lib/route-handler";
import { CacheControl } from "@/lib/cache";
import { createNotification, listUserNotifications } from "@/lib/notifications";
import { zLimitParam, zCursorParam } from "@/lib/query-params";
import { createNotificationRequestSchema } from "@/lib/notifications/request";

const notificationsQuery = z.object({
  limit: zLimitParam(20, 100),
  cursor: zCursorParam,
});

export const GET = authDataRoute(async (_request, { auth, query }) => {
  const result = await listUserNotifications({
    userId: auth.userId,
    limit: query.limit,
    cursor: query.cursor ?? undefined,
  });

  return NextResponse.json(
    result,
    { headers: { "Cache-Control": CacheControl.privateNoCache } },
  );
}, { route: "/api/notifications", query: notificationsQuery });

export const POST = authRoute(
  async (_request, { auth, body }) => {
    const { type, title, message, href, songId } = body;

    const notification = await createNotification({
      userId: auth.userId,
      type,
      title,
      message,
      href: href || null,
      songId: songId || null,
    });

    return NextResponse.json({ notification }, { status: 201 });
  },
  { route: "/api/notifications", body: createNotificationRequestSchema },
);

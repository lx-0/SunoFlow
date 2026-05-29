import { NextResponse } from "next/server";
import { z } from "zod";
import { authDataRoute, authRoute } from "@/lib/route-handler";
import { notFound } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { PUSH_PREFERENCES_SELECT, toPushPreferencesResponse } from "@/lib/push-preferences";

const pushPreferencesPatchBody = z.object({
  pushGenerationComplete: z.boolean().optional(),
  pushNewFollower: z.boolean().optional(),
  pushSongComment: z.boolean().optional(),
}).refine(
  (data) =>
    data.pushGenerationComplete !== undefined
    || data.pushNewFollower !== undefined
    || data.pushSongComment !== undefined,
  "No fields to update",
);

export const GET = authDataRoute(async (_request, { auth }) => {
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: PUSH_PREFERENCES_SELECT,
  });

  if (!user) {
    return notFound("User not found");
  }

  return toPushPreferencesResponse(user);
}, { route: "/api/push/preferences" });

export const PATCH = authRoute(async (_request, { auth, body }) => {
  const user = await prisma.user.update({
    where: { id: auth.userId },
    data: body,
    select: PUSH_PREFERENCES_SELECT,
  });

  return NextResponse.json(toPushPreferencesResponse(user));
}, { route: "/api/push/preferences", body: pushPreferencesPatchBody });

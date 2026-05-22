import { z } from "zod";
import { authRoute } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import {
  buildEmailPreferencesUpdateData,
  EMAIL_PREFERENCES_SELECT,
  toEmailPreferencesResponse,
} from "@/lib/profile/email-preferences";
import { getUserOrNotFound } from "@/lib/profile/user";

const VALID_DIGEST_FREQUENCIES = ["daily", "weekly", "monthly", "off"] as const;
const updateEmailPreferencesSchema = z.object({
  emailWelcome: z.boolean().optional(),
  emailGenerationComplete: z.boolean().optional(),
  emailDigestFrequency: z.enum(VALID_DIGEST_FREQUENCIES).optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.number().int().min(0).max(23).optional(),
  quietHoursEnd: z.number().int().min(0).max(23).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "No fields to update" },
);

export const GET = authRoute(async (_request, { auth }) => {
  const userResult = await getUserOrNotFound(auth.userId, EMAIL_PREFERENCES_SELECT);

  if (!userResult.ok) {
    return userResult.response;
  }

  return Response.json(toEmailPreferencesResponse(userResult.user));
}, { route: "/api/profile/email-preferences" });

export const PATCH = authRoute(async (_request, { auth, body }) => {
  const data = buildEmailPreferencesUpdateData(body);

  // Ensure user has an unsubscribe token
  const existing = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { unsubscribeToken: true },
  });
  if (!existing?.unsubscribeToken) {
    data.unsubscribeToken = crypto.randomUUID();
  }

  const user = await prisma.user.update({
    where: { id: auth.userId },
    data,
    select: EMAIL_PREFERENCES_SELECT,
  });

  return Response.json(toEmailPreferencesResponse(user));
}, {
  route: "/api/profile/email-preferences",
  body: updateEmailPreferencesSchema,
});

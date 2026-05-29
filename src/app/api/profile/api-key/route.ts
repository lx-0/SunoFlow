import { z } from "zod";
import { authDataRoute, authRoute, resultResponse } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";
import { buildApiKeyUpdateData, toApiKeyResponse } from "@/lib/profile/api-key";
import { getUserOrNotFound } from "@/lib/profile/user";

const updateApiKeySchema = z
  .object({
    sunoApiKey: z.string().optional(),
    usePersonalApiKey: z.boolean().optional(),
  })
  .refine(
    (value) => value.sunoApiKey !== undefined || value.usePersonalApiKey !== undefined,
    { message: "Provide sunoApiKey or usePersonalApiKey" },
  );

export const GET = authDataRoute(async (_request, { auth }) => {
  const userResult = await getUserOrNotFound(auth.userId, {
    sunoApiKey: true,
    usePersonalApiKey: true,
  });

  if (!userResult.ok) return resultResponse(userResult);

  return toApiKeyResponse(userResult.data);
}, { route: "/api/profile/api-key" });

export const PATCH = authRoute(async (_request, { auth, body }) => {
  const updateData = buildApiKeyUpdateData(body);

  const updated = await prisma.user.update({
    where: { id: auth.userId },
    data: updateData,
    select: { sunoApiKey: true, usePersonalApiKey: true },
  });

  return Response.json(toApiKeyResponse(updated));
}, {
  route: "/api/profile/api-key",
  body: updateApiKeySchema,
});

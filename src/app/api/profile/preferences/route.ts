import { authDataRoute, authRoute, resultResponse } from "@/lib/route-handler";
import { getPreferences, updatePreferences } from "@/lib/profile";
import { z } from "zod";

const updatePreferencesBody = z.object({
  defaultStyle: z.string().nullable().optional(),
  preferredGenres: z.array(z.string()).optional(),
});

export const GET = authDataRoute(async (_request, { auth }) => {
  const result = await getPreferences(auth.userId);
  if (!result.ok) return resultResponse(result);
  return result.data;
}, { route: "/api/profile/preferences" });

export const PATCH = authRoute(async (_request, { auth, body }) => {
  return resultResponse(await updatePreferences(auth.userId, body));
}, { route: "/api/profile/preferences", body: updatePreferencesBody });

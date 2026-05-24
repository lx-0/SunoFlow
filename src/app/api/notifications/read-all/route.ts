import { authDataRoute } from "@/lib/route-handler";
import { markAllRead } from "@/lib/notifications";

export const PATCH = authDataRoute(async (_request, { auth }) => {
  await markAllRead(auth.userId);

  return { ok: true };
}, { route: "/api/notifications/read-all" });

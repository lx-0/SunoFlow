import { authRoute, resultResponse } from "@/lib/route-handler";
import { getJamSession } from "@/lib/jam";

export const GET = authRoute<{ id: string }>(
  async (_request, { auth, params }) =>
    resultResponse(await getJamSession(params.id, auth.userId)),
  { route: "/api/jam-sessions/[id]" },
);

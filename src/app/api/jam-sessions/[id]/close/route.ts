import { authRoute, resultResponse } from "@/lib/route-handler";
import { closeJamSession } from "@/lib/jam";

export const POST = authRoute<{ id: string }>(
  async (_request, { auth, params }) =>
    resultResponse(await closeJamSession(params.id, auth.userId)),
  { route: "/api/jam-sessions/[id]/close" },
);

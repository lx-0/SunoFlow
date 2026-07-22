import { authRoute, resultResponse } from "@/lib/route-handler";
import { vetoJamEntry } from "@/lib/jam";

export const DELETE = authRoute<{ id: string; entryId: string }>(
  async (_request, { auth, params }) =>
    resultResponse(await vetoJamEntry(params.id, params.entryId, auth.userId)),
  { route: "/api/jam-sessions/[id]/entries/[entryId]" },
);

import { syncLyricTimestamps } from "@/lib/lyrics";
import { authRoute, resultResponse } from "@/lib/route-handler";

export const POST = authRoute<{ id: string }>(
  async (_request, { auth, params }) =>
    resultResponse(await syncLyricTimestamps(params.id, auth.userId)),
  { route: "/api/songs/[id]/lyrics/timestamps/sync" },
);

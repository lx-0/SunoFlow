import { authRoute, resultResponse, successResponse } from "@/lib/route-handler";
import { Tags } from "@/lib/tags";

export const DELETE = authRoute<{ id: string; tagId: string }>(
  async (_request, { auth, params }) => {
    const result = await Tags.removeFromSong(
      auth.userId,
      params.id,
      params.tagId,
    );
    if (!result.ok) return resultResponse(result);
    return successResponse();
  },
  { route: "/api/songs/[id]/tags/[tagId]" },
);

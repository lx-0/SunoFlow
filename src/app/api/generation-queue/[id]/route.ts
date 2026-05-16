import { authRoute } from "@/lib/route-handler";
import { cancelItem } from "@/lib/generation-queue";
import { resultResponse } from "@/lib/route-response";

export const DELETE = authRoute<{ id: string }>(
  async (_request, { auth, params }) => {
    const result = await cancelItem(auth.userId, params.id);
    return resultResponse(result);
  },
  {
    route: "/api/generation-queue/[id]",
  }
);

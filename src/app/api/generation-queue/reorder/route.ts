import { z } from "zod";
import { authRoute, successResponse } from "@/lib/route-handler";
import { reorderItems } from "@/lib/generation-queue";

const reorderBody = z.object({
  orderedIds: z.array(z.string()),
});

export const POST = authRoute<Record<string, never>, z.infer<typeof reorderBody>>(
  async (_request, { auth, body }) => {
    const { orderedIds } = body;

    await reorderItems(auth.userId, orderedIds);
    return successResponse();
  },
  {
    body: reorderBody,
    route: "/api/generation-queue/reorder",
  }
);

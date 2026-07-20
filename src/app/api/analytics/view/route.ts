import { z } from "zod";
import { publicRoute, resultResponse } from "@/lib/route-handler";
import { recordView } from "@/lib/analytics-data";
import { getClientIp } from "@/lib/network";

const bodySchema = z.object({
  songId: z.string().min(1),
});

export const POST = publicRoute<Record<string, never>, z.infer<typeof bodySchema>>(
  async (request, { body }) => {
    return resultResponse(await recordView(body.songId, getClientIp(request)), {
      status: 201,
    });
  },
  {
    route: "/api/analytics/view",
    body: bodySchema,
  },
);

import { authRoute } from "@/lib/route-handler";
import { processNextItem } from "@/lib/generation-queue";
import { processNextResultToResponse } from "@/lib/generation-queue/http";

export const POST = authRoute(async (_request, { auth }) => {
  const result = await processNextItem(auth.userId);
  return processNextResultToResponse(result);
}, { route: "/api/generation-queue/process-next" });

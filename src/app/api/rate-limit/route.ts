import { authDataRoute } from "@/lib/route-handler";
import { getRateLimitStatus } from "@/lib/rate-limit";

export const GET = authDataRoute(async (_request, { auth }) => {
  const { status } = await getRateLimitStatus(auth.userId);
  return status;
});

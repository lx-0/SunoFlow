import { authDataRoute } from "@/lib/route-handler";
import { getMonthlyCreditUsage } from "@/lib/credits";

export const GET = authDataRoute(async (_request, { auth }) => {
  return getMonthlyCreditUsage(auth.userId);
});

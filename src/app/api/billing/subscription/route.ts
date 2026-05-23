import { authDataRoute } from "@/lib/route-handler";
import { getSubscriptionStatus } from "@/lib/billing";

export const GET = authDataRoute(async (_request, { auth }) => {
  return getSubscriptionStatus(auth.userId);
}, { route: "/api/billing/subscription" });

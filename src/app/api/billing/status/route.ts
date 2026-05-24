import { publicDataRoute } from "@/lib/route-handler";
import { isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export const GET = publicDataRoute(async () => {
  return { stripeConfigured: isStripeConfigured() };
}, { route: "/api/billing/status" });

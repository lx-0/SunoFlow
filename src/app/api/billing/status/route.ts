import { isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ stripeConfigured: isStripeConfigured() });
}

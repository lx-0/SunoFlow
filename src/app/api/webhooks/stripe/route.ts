import { createLegacyStripeWebhookRoute } from "@/lib/billing/stripe-webhook-routes";

export const dynamic = "force-dynamic";

export const POST = createLegacyStripeWebhookRoute();

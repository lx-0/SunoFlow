import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import { logServerError } from "@/lib/error-logger";
import { handleBillingEvent } from "@/lib/billing";
import { createStripeWebhookRoute } from "@/lib/billing/webhook-route";
import { webhookAck } from "@/lib/webhooks/ack";

type StripeWebhookSpec = {
  routeTag: string;
  onDuplicate: (event: Stripe.Event) => NextResponse;
  onHandleEvent: (event: Stripe.Event) => Promise<void>;
  onError: (error: unknown, event: Stripe.Event) => NextResponse;
  onInvalidSignature?: (error: unknown) => string;
};

function createStripeWebhookRouteHandler(spec: StripeWebhookSpec) {
  return createStripeWebhookRoute(spec);
}

const BILLING_WEBHOOK_SPEC: StripeWebhookSpec = {
  routeTag: "/api/billing/webhook",
  onDuplicate: (event: Stripe.Event) => {
    logger.info({ eventId: event.id }, "billing-webhook: duplicate event, skipping");
    return webhookAck();
  },
  onHandleEvent: handleBillingEvent,
  onError: (error, event) => {
    logServerError("billing-webhook-handler", error, {
      route: "/api/billing/webhook",
      params: { eventId: event.id, eventType: event.type },
    });
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  },
};

const LEGACY_STRIPE_WEBHOOK_SPEC: StripeWebhookSpec = {
  routeTag: "/api/webhooks/stripe",
  onInvalidSignature: (error) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    return `Webhook signature verification failed: ${message}`;
  },
  onDuplicate: () => webhookAck({ duplicate: true }),
  onHandleEvent: async (event: Stripe.Event) => {
    logger.info({ eventId: event.id, type: event.type }, "Stripe webhook received");
    await handleBillingEvent(event);
  },
  onError: (error, event) => {
    logger.error({ err: error, eventId: event.id, type: event.type }, "Error handling Stripe webhook event");
    return NextResponse.json(
      { error: "Internal error processing event" },
      { status: 500 }
    );
  },
};

export function createBillingWebhookRoute() {
  return createStripeWebhookRouteHandler(BILLING_WEBHOOK_SPEC);
}

export function createLegacyStripeWebhookRoute() {
  return createStripeWebhookRouteHandler(LEGACY_STRIPE_WEBHOOK_SPEC);
}

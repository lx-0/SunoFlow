/**
 * Server-side Stripe client singleton.
 * Import this module only in server-side code (API routes, server components).
 * The client is instantiated lazily so builds succeed without STRIPE_SECRET_KEY set.
 */

import Stripe from "stripe";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
    }
    _stripe = new Stripe(key, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _stripe;
}

export default getStripe;

export const STRIPE_WEBHOOK_SECRET = (): string =>
  process.env.STRIPE_WEBHOOK_SECRET ?? "";

export const STRIPE_PRICES = {
  get starter() { return process.env.STRIPE_PRICE_STARTER ?? ""; },
  get pro() { return process.env.STRIPE_PRICE_PRO ?? ""; },
  get studio() { return process.env.STRIPE_PRICE_STUDIO ?? ""; },
} as const;

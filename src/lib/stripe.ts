/**
 * Lazy Stripe singleton for ZedImpact.
 * Uses a Proxy to defer initialization until first use,
 * preventing build-time crashes when STRIPE_SECRET_KEY is not set.
 */
import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Returns (and lazily initializes) the Stripe client.
 * Throws a descriptive error if STRIPE_SECRET_KEY is not configured.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY environment variable is not set. " +
          "Add it to your .env file to enable Stripe payments."
      );
    }
    _stripe = new Stripe(key, {
      apiVersion: "2026-02-25.clover" as Stripe.LatestApiVersion,
    });
  }
  return _stripe;
}

/** Reset the cached client — used in tests only. */
export function _resetStripeForTest(): void {
  _stripe = null;
}

import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { createPaymentRecord } from "@/lib/services/payment.service";
import { incrementCampaignRaisedAmount } from "@/lib/services/campaign-mt.service";
import { withOrgContext } from "@/lib/org-context";
import type Stripe from "stripe";

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events to update donation and payment statuses.
 * Verified via Stripe-Signature header. All handlers are idempotent.
 */
export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[webhook/stripe] STRIPE_WEBHOOK_SECRET not configured");
    return jsonResponse(
      { success: false, error: "Webhook secret not configured" },
      500
    );
  }

  const headerPayload = await headers();
  const signature = headerPayload.get("stripe-signature");

  if (!signature) {
    return jsonResponse(
      { success: false, error: "Missing stripe-signature header" },
      400
    );
  }

  const rawBody = await req.text();
  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhook/stripe] Signature verification failed:", message);
    return jsonResponse(
      { success: false, error: `Webhook verification failed: ${message}` },
      400
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "checkout.session.expired":
        await handleCheckoutExpired(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        // Acknowledge unhandled events silently
        break;
    }

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[webhook/stripe] Handler error:", { eventType: event.type, err });
    // Return 500 so Stripe retries — do not silently drop
    return jsonResponse(
      { success: false, error: "Handler error — will retry" },
      500
    );
  }
}

// ── Event Handlers ────────────────────────────────────────────────────

/**
 * Handles checkout.session.completed — marks donation as COMPLETED,
 * creates a Payment record, and increments campaign raisedAmount.
 * Idempotent: checks existing payment before creating a new one.
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const donationId = session.metadata?.donationId;
  const orgId = session.metadata?.orgId;

  if (!donationId || !orgId) {
    console.warn("[webhook/stripe] checkout.session.completed: missing metadata", {
      sessionId: session.id,
    });
    return;
  }

  // Idempotent: skip if donation is already COMPLETED
  const donation = await withOrgContext(orgId, () =>
    prisma.donation.findUnique({
      where: { id: donationId },
      select: { id: true, status: true, amount: true, campaignId: true },
    })
  );

  if (!donation) {
    console.warn("[webhook/stripe] Donation not found:", donationId);
    return;
  }

  if (donation.status === "COMPLETED") {
    // Already processed — idempotent return
    return;
  }

  // Update donation status
  await withOrgContext(orgId, () =>
    prisma.donation.update({
      where: { id: donationId },
      data: { status: "COMPLETED" },
    })
  );

  // Create payment record (idempotent: check first)
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  if (paymentIntentId) {
    const existingPayment = await prisma.payment.findFirst({
      where: { gatewayTransactionId: paymentIntentId },
      select: { id: true },
    });

    if (!existingPayment) {
      await createPaymentRecord({
        organizationId: orgId,
        donationId,
        amount: (session.amount_total ?? 0) / 100,
        currency: (session.currency ?? "usd").toUpperCase(),
        gateway: "STRIPE",
        status: "COMPLETED",
        gatewayTransactionId: paymentIntentId,
        gatewayReferenceId: session.id,
        processedAt: new Date(),
      });
    }
  }

  // Increment campaign raised amount if linked
  if (donation.campaignId) {
    await incrementCampaignRaisedAmount(donation.campaignId, donation.amount);
  }
}

/**
 * Handles checkout.session.expired — marks donation as CANCELLED.
 */
async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const donationId = session.metadata?.donationId;
  const orgId = session.metadata?.orgId;

  if (!donationId || !orgId) return;

  await withOrgContext(orgId, () =>
    prisma.donation.updateMany({
      where: { id: donationId, status: "PENDING" },
      data: { status: "CANCELLED" },
    })
  );
}

/**
 * Handles payment_intent.payment_failed — marks donation as FAILED.
 */
async function handlePaymentFailed(intent: Stripe.PaymentIntent) {
  const donationId = intent.metadata?.donationId;
  const orgId = intent.metadata?.orgId;

  if (!donationId || !orgId) return;

  await withOrgContext(orgId, () =>
    prisma.donation.updateMany({
      where: { id: donationId, status: "PENDING" },
      data: { status: "FAILED" },
    })
  );
}

/**
 * Handles customer.subscription.deleted — marks recurring donation as CANCELLED.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const donationId = subscription.metadata?.donationId;
  const orgId = subscription.metadata?.orgId;

  if (!donationId || !orgId) return;

  await withOrgContext(orgId, () =>
    prisma.donation.updateMany({
      where: { id: donationId, status: { in: ["PENDING", "COMPLETED"] } },
      data: { status: "CANCELLED" },
    })
  );
}

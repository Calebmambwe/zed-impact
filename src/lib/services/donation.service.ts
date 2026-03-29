/**
 * Donation payment gateway service for ZedImpact.
 * Handles Stripe checkout session creation (one-time + recurring)
 * and DPO Group mobile money payment initiation.
 */
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { withOrgContext } from "@/lib/org-context";
import { createPaymentRecord } from "./payment.service";
import type { CheckoutInput, MobileMoneyInput } from "@/lib/validations/donation";

export interface CheckoutResult {
  checkoutUrl: string;
  donationId: string;
}

export interface MobileMoneyResult {
  referenceId: string;
  donationId: string;
}

/**
 * Creates a Stripe checkout session for a one-time or recurring donation.
 * Persists a PENDING Donation record before redirecting to Stripe.
 *
 * @param orgId - Organization ID (used for Connect routing and org context)
 * @param input - Validated checkout input
 * @returns checkoutUrl to redirect the donor, and the internal donationId
 */
export async function createCheckoutSession(
  orgId: string,
  input: CheckoutInput
): Promise<CheckoutResult> {
  const stripe = getStripe();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Resolve org to get the slug for redirect URLs
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { slug: true, stripeAccountId: true },
  });

  // Create donation record with PENDING status
  const donation = await withOrgContext(orgId, () =>
    prisma.donation.create({
      data: {
        organizationId: orgId,
        amount: input.amount,
        currency: "USD",
        status: "PENDING",
        type: input.isRecurring ? "RECURRING" : "ONE_TIME",
        paymentMethod: "CARD",
        gateway: "STRIPE",
        isRecurring: input.isRecurring ?? false,
        frequency: input.frequency ?? null,
        donorName: input.donorName,
        donorEmail: input.donorEmail,
        message: input.message ?? null,
        isAnonymous: input.isAnonymous ?? false,
        campaignId: input.campaignId ?? null,
        formId: input.formId ?? null,
      },
    })
  );

  const successUrl = `${appUrl}/${org.slug}/donate/success?donationId=${donation.id}`;
  const cancelUrl = `${appUrl}/${org.slug}/donate`;

  let sessionUrl: string;

  if (input.isRecurring) {
    // Recurring: create a product + price on the fly then subscription checkout
    const product = await stripe.products.create({
      name: `Recurring Donation — ${input.donorName}`,
      metadata: { donationId: donation.id, orgId },
    });

    const intervalMap: Record<string, "month" | "year"> = {
      monthly: "month",
      quarterly: "month",
      annual: "year",
    };
    const intervalCount: Record<string, number> = {
      monthly: 1,
      quarterly: 3,
      annual: 1,
    };
    const freq = input.frequency ?? "monthly";

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(input.amount * 100),
      currency: "usd",
      recurring: {
        interval: intervalMap[freq] ?? "month",
        interval_count: intervalCount[freq] ?? 1,
      },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: input.donorEmail,
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { donationId: donation.id, orgId },
    });

    sessionUrl = session.url!;

    // Update donation with session ID
    await withOrgContext(orgId, () =>
      prisma.donation.update({
        where: { id: donation.id },
        data: { stripeSessionId: session.id },
      })
    );
  } else {
    // One-time payment
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: input.donorEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(input.amount * 100),
            product_data: {
              name: `Donation to ${org.slug}`,
              description: input.message ?? undefined,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { donationId: donation.id, orgId },
    });

    sessionUrl = session.url!;

    await withOrgContext(orgId, () =>
      prisma.donation.update({
        where: { id: donation.id },
        data: { stripeSessionId: session.id },
      })
    );
  }

  return { checkoutUrl: sessionUrl, donationId: donation.id };
}

/**
 * Initiates a mobile money payment via DPO Group.
 * Creates Donation + Payment records with PENDING status.
 * The donor is redirected to the DPO payment page.
 *
 * @param orgId - Organization ID
 * @param input - Validated mobile money input
 * @returns referenceId (DPO TransactionToken) and internal donationId
 */
export async function createMobileMoneyRequest(
  orgId: string,
  input: MobileMoneyInput
): Promise<MobileMoneyResult> {
  const dpoBaseUrl =
    process.env.DPO_API_URL ?? "https://secure.3gdirectpay.com/API/v6/";
  const dpoCompanyToken = process.env.DPO_COMPANY_TOKEN;

  if (!dpoCompanyToken) {
    throw new Error(
      "DPO_COMPANY_TOKEN environment variable is not set. " +
        "Configure it to enable mobile money payments."
    );
  }

  // Create donation record
  const donation = await withOrgContext(orgId, () =>
    prisma.donation.create({
      data: {
        organizationId: orgId,
        amount: input.amount,
        currency: "USD",
        status: "PENDING",
        type: "ONE_TIME",
        paymentMethod: "MOBILE_MONEY",
        gateway: "DPO_GROUP",
        isRecurring: false,
        donorName: input.donorName,
        donorEmail: input.donorEmail,
        campaignId: input.campaignId ?? null,
        formId: input.formId ?? null,
      },
    })
  );

  // DPO Group XML-based API v6 — CreateToken request
  const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${dpoCompanyToken}</CompanyToken>
  <Request>createToken</Request>
  <Transaction>
    <PaymentAmount>${input.amount.toFixed(2)}</PaymentAmount>
    <PaymentCurrency>USD</PaymentCurrency>
    <CompanyRef>${donation.id}</CompanyRef>
    <RedirectURL>${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/webhooks/mobile-money</RedirectURL>
    <BackURL>${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}</BackURL>
    <CompanyRefUnique>0</CompanyRefUnique>
    <PTL>5</PTL>
  </Transaction>
  <Services>
    <Service>
      <ServiceType>5525</ServiceType>
      <ServiceDescription>Donation</ServiceDescription>
      <ServiceDate>${new Date().toISOString().split("T")[0]}</ServiceDate>
    </Service>
  </Services>
</API3G>`;

  let transactionToken: string;

  try {
    const response = await fetch(dpoBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xmlBody,
    });

    const responseText = await response.text();
    // Extract TransactionToken from XML response
    const match = responseText.match(/<TransactionToken>([^<]+)<\/TransactionToken>/);
    if (!match) {
      throw new Error(`DPO createToken failed: ${responseText}`);
    }
    transactionToken = match[1];
  } catch (err) {
    // Mark donation as FAILED on API error
    await withOrgContext(orgId, () =>
      prisma.donation.update({
        where: { id: donation.id },
        data: { status: "FAILED" },
      })
    );
    throw err;
  }

  // Create payment record with pending status
  await createPaymentRecord({
    organizationId: orgId,
    donationId: donation.id,
    amount: input.amount,
    currency: "USD",
    gateway: "DPO_GROUP",
    status: "PENDING",
    gatewayReferenceId: transactionToken,
  });

  return { referenceId: transactionToken, donationId: donation.id };
}

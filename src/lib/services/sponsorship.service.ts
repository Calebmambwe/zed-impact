/**
 * Sponsorship lifecycle service for ZedImpact.
 * Manages creation, status transitions, and Stripe subscription integration.
 * All state transitions enforce the lifecycle: ACTIVE ↔ PAUSED, ACTIVE → CANCELLED.
 */
import { prisma } from "@/lib/db";
import { withOrgContext } from "@/lib/org-context";
import { getStripe } from "@/lib/stripe";
import { NotFoundError } from "@/lib/org-auth";
import type { SponsorshipStatus } from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SponsorshipListOptions {
  page?: number;
  limit?: number;
  status?: SponsorshipStatus;
  childId?: string;
  userId?: string;
}

export interface SponsorshipListResult {
  sponsorships: SponsorshipSummary[];
  meta: { page: number; limit: number; total: number };
}

export interface SponsorshipSummary {
  id: string;
  status: SponsorshipStatus;
  monthlyAmount: number;
  startDate: Date;
  endDate: Date | null;
  churnScore: number | null;
  createdAt: Date;
  child: { id: string; firstName: string; lastName: string; profileImageUrl: string | null };
  user: { id: string; name: string | null; email: string };
}

// ── List ───────────────────────────────────────────────────────────────────────

/**
 * Returns paginated sponsorships with optional filters.
 */
export async function listSponsorships(
  orgId: string,
  options: SponsorshipListOptions
): Promise<SponsorshipListResult> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (options.status) where.status = options.status;
  if (options.childId) where.childId = options.childId;
  if (options.userId) where.userId = options.userId;

  const [sponsorships, total] = await withOrgContext(orgId, () =>
    Promise.all([
      prisma.sponsorship.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          monthlyAmount: true,
          startDate: true,
          endDate: true,
          churnScore: true,
          createdAt: true,
          child: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true,
            },
          },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.sponsorship.count({ where }),
    ])
  );

  return {
    sponsorships: sponsorships as SponsorshipSummary[],
    meta: { page, limit, total },
  };
}

// ── Get detail ─────────────────────────────────────────────────────────────────

/**
 * Returns full sponsorship detail with child, user, letters, and messages.
 */
export async function getSponsorship(orgId: string, sponsorshipId: string) {
  const sponsorship = await withOrgContext(orgId, () =>
    prisma.sponsorship.findUnique({
      where: { id: sponsorshipId },
      include: {
        child: {
          include: {
            program: true,
            school: true,
            childUpdates: { orderBy: { createdAt: "desc" }, take: 10 },
          },
        },
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        letters: { orderBy: { createdAt: "desc" } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    })
  );

  if (!sponsorship) {
    throw new NotFoundError(`Sponsorship ${sponsorshipId} not found`);
  }

  return sponsorship;
}

// ── Create ─────────────────────────────────────────────────────────────────────

/**
 * Creates a new sponsorship in a transaction:
 * 1. Verifies the child is available
 * 2. Creates a Stripe subscription
 * 3. Creates the Sponsorship record
 * 4. Marks the child as unavailable
 *
 * @param orgId - Organization ID
 * @param childId - Child to sponsor
 * @param userId - Sponsor user ID
 * @param stripePaymentMethodId - Stripe payment method ID
 * @param monthlyAmount - Monthly sponsorship amount in USD
 */
export async function createSponsorship(
  orgId: string,
  childId: string,
  userId: string,
  stripePaymentMethodId: string,
  monthlyAmount: number
) {
  // Verify child availability first (outside transaction to get clear error)
  const child = await withOrgContext(orgId, () =>
    prisma.child.findUnique({
      where: { id: childId },
      select: { id: true, isAvailable: true, firstName: true, lastName: true },
    })
  );

  if (!child) {
    throw new NotFoundError(`Child ${childId} not found`);
  }

  if (!child.isAvailable) {
    throw new Error(`${child.firstName} ${child.lastName} is not available for sponsorship`);
  }

  // Get the user's Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, stripeCustomerId: true },
  });

  if (!user) {
    throw new NotFoundError(`User ${userId} not found`);
  }

  const stripe = getStripe();

  // Ensure the user has a Stripe customer
  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id, orgId },
    });
    stripeCustomerId = customer.id;
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId },
    });
  }

  // Attach the payment method to the customer
  await stripe.paymentMethods.attach(stripePaymentMethodId, {
    customer: stripeCustomerId,
  });

  // Create a subscription product + price
  const product = await stripe.products.create({
    name: `Child Sponsorship — ${child.firstName} ${child.lastName}`,
    metadata: { childId, orgId },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(monthlyAmount * 100),
    currency: "usd",
    recurring: { interval: "month" },
  });

  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: price.id }],
    default_payment_method: stripePaymentMethodId,
    metadata: { childId, orgId, userId },
  });

  // Persist in a transaction: create Sponsorship + mark child unavailable
  const sponsorship = await prisma.$transaction(async (tx) => {
    const created = await tx.sponsorship.create({
      data: {
        organizationId: orgId,
        userId,
        childId,
        status: "ACTIVE",
        stripeSubscriptionId: subscription.id,
        monthlyAmount,
        startDate: new Date(),
      },
    });

    await tx.child.update({
      where: { id: childId },
      data: { isAvailable: false },
    });

    return created;
  });

  return sponsorship;
}

// ── Pause ──────────────────────────────────────────────────────────────────────

/**
 * Pauses an active sponsorship.
 * Pauses the Stripe subscription and sets status to PAUSED.
 */
export async function pauseSponsorship(orgId: string, sponsorshipId: string) {
  const sponsorship = await assertSponsorshipExists(orgId, sponsorshipId);

  if (sponsorship.status !== "ACTIVE") {
    throw new Error(`Cannot pause a sponsorship with status ${sponsorship.status}`);
  }

  const stripe = getStripe();

  if (sponsorship.stripeSubscriptionId) {
    await stripe.subscriptions.update(sponsorship.stripeSubscriptionId, {
      pause_collection: { behavior: "void" },
    });
  }

  return withOrgContext(orgId, () =>
    prisma.sponsorship.update({
      where: { id: sponsorshipId },
      data: { status: "PAUSED", pausedAt: new Date() },
    })
  );
}

// ── Resume ─────────────────────────────────────────────────────────────────────

/**
 * Resumes a paused sponsorship.
 * Resumes the Stripe subscription and sets status to ACTIVE.
 */
export async function resumeSponsorship(orgId: string, sponsorshipId: string) {
  const sponsorship = await assertSponsorshipExists(orgId, sponsorshipId);

  if (sponsorship.status !== "PAUSED") {
    throw new Error(`Cannot resume a sponsorship with status ${sponsorship.status}`);
  }

  const stripe = getStripe();

  if (sponsorship.stripeSubscriptionId) {
    await stripe.subscriptions.update(sponsorship.stripeSubscriptionId, {
      pause_collection: "",
    });
  }

  return withOrgContext(orgId, () =>
    prisma.sponsorship.update({
      where: { id: sponsorshipId },
      data: { status: "ACTIVE", pausedAt: null },
    })
  );
}

// ── Cancel ─────────────────────────────────────────────────────────────────────

/**
 * Cancels a sponsorship.
 * Cancels the Stripe subscription, sets status to CANCELLED,
 * and restores child availability in a transaction.
 */
export async function cancelSponsorship(orgId: string, sponsorshipId: string) {
  const sponsorship = await assertSponsorshipExists(orgId, sponsorshipId);

  if (sponsorship.status === "CANCELLED") {
    throw new Error("Sponsorship is already cancelled");
  }

  const stripe = getStripe();

  if (sponsorship.stripeSubscriptionId) {
    await stripe.subscriptions.cancel(sponsorship.stripeSubscriptionId);
  }

  return prisma.$transaction(async (tx) => {
    const cancelled = await tx.sponsorship.update({
      where: { id: sponsorshipId },
      data: { status: "CANCELLED", endDate: new Date() },
    });

    // Restore child availability
    await tx.child.update({
      where: { id: sponsorship.childId },
      data: { isAvailable: true },
    });

    return cancelled;
  });
}

// ── Sponsor self-service ───────────────────────────────────────────────────────

/**
 * Returns all sponsorships for a given sponsor user within the org.
 */
export async function getSponsorshipsByUser(orgId: string, userId: string) {
  return withOrgContext(orgId, () =>
    prisma.sponsorship.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true,
            program: { select: { id: true, name: true } },
            school: { select: { id: true, name: true } },
          },
        },
      },
    })
  );
}

// ── Waitlist ───────────────────────────────────────────────────────────────────

/**
 * Adds a user to the child's sponsor waitlist with the next sequential position.
 */
export async function addToWaitlist(
  orgId: string,
  childId: string,
  userId: string | undefined,
  email: string
) {
  // Check child exists
  const child = await withOrgContext(orgId, () =>
    prisma.child.findUnique({ where: { id: childId }, select: { id: true } })
  );

  if (!child) {
    throw new NotFoundError(`Child ${childId} not found`);
  }

  // Get next position
  const lastEntry = await withOrgContext(orgId, () =>
    prisma.sponsorWaitlist.findFirst({
      where: { childId },
      orderBy: { position: "desc" },
      select: { position: true },
    })
  );

  const position = (lastEntry?.position ?? 0) + 1;

  return withOrgContext(orgId, () =>
    prisma.sponsorWaitlist.create({
      data: {
        organizationId: orgId,
        childId,
        userId,
        email,
        position,
      },
    })
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function assertSponsorshipExists(orgId: string, sponsorshipId: string) {
  const sponsorship = await withOrgContext(orgId, () =>
    prisma.sponsorship.findUnique({
      where: { id: sponsorshipId },
      select: {
        id: true,
        status: true,
        childId: true,
        stripeSubscriptionId: true,
      },
    })
  );

  if (!sponsorship) {
    throw new NotFoundError(`Sponsorship ${sponsorshipId} not found`);
  }

  return sponsorship;
}

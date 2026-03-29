/**
 * Multi-tenant donation CRUD and stats service for ZedImpact.
 * All Prisma queries run inside orgStorage context set by the caller.
 */
import { prisma } from "@/lib/db";
import { withOrgContext } from "@/lib/org-context";
import type { DonationStatus, PaymentMethod } from "@prisma/client";

export interface DonationListOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: DonationStatus;
  campaignId?: string;
}

export interface DonationStats {
  totalRaised: number;
  donationCount: number;
  averageGift: number;
  thisMonthRaised: number;
  lastMonthRaised: number;
}

export interface ManualDonationData {
  donorName: string;
  donorEmail: string;
  amount: number;
  currency?: string;
  paymentMethod?: PaymentMethod;
  campaignId?: string;
  notes?: string;
  donationDate?: string;
  isAnonymous?: boolean;
}

/**
 * Returns a paginated list of donations for the given org.
 *
 * @param orgId - Organization ID
 * @param opts - Pagination, search, and filter options
 */
export async function listDonations(
  orgId: string,
  opts: DonationListOptions = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (opts.status) {
    where.status = opts.status;
  }
  if (opts.campaignId) {
    where.campaignId = opts.campaignId;
  }
  if (opts.search) {
    where.OR = [
      { donorName: { contains: opts.search, mode: "insensitive" } },
      { donorEmail: { contains: opts.search, mode: "insensitive" } },
    ];
  }

  return withOrgContext(orgId, async () => {
    const [donations, total] = await Promise.all([
      prisma.donation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          donorName: true,
          donorEmail: true,
          amount: true,
          currency: true,
          status: true,
          type: true,
          paymentMethod: true,
          gateway: true,
          isRecurring: true,
          frequency: true,
          isAnonymous: true,
          message: true,
          createdAt: true,
          campaignId: true,
          campaign: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      prisma.donation.count({ where }),
    ]);

    return {
      donations,
      meta: { page, limit, total },
    };
  });
}

/**
 * Fetches a single donation with its payment records.
 *
 * @param orgId - Organization ID
 * @param donationId - Donation ID
 */
export async function getDonationById(orgId: string, donationId: string) {
  return withOrgContext(orgId, () =>
    prisma.donation.findUnique({
      where: { id: donationId },
      include: {
        payments: true,
        campaign: { select: { id: true, name: true, slug: true } },
        tribute: true,
      },
    })
  );
}

/**
 * Records a manual donation entry from the admin form.
 * Does NOT go through a payment gateway — used for offline donations (cash, check, etc.).
 *
 * @param orgId - Organization ID
 * @param data - Manual donation data
 */
export async function createDonationRecord(
  orgId: string,
  data: ManualDonationData
) {
  return withOrgContext(orgId, () =>
    prisma.donation.create({
      data: {
        organizationId: orgId,
        donorName: data.donorName,
        donorEmail: data.donorEmail,
        amount: data.amount,
        currency: data.currency ?? "USD",
        status: "COMPLETED",
        type: "ONE_TIME",
        paymentMethod: data.paymentMethod ?? "CASH",
        gateway: "MANUAL",
        isRecurring: false,
        isAnonymous: data.isAnonymous ?? false,
        message: data.notes ?? null,
        campaignId: data.campaignId ?? null,
        createdAt: data.donationDate ? new Date(data.donationDate) : new Date(),
      },
    })
  );
}

/**
 * Partially updates a donation record (status, message).
 *
 * @param orgId - Organization ID
 * @param donationId - Donation ID
 * @param data - Fields to update
 */
export async function updateDonation(
  orgId: string,
  donationId: string,
  data: { status?: DonationStatus; message?: string }
) {
  return withOrgContext(orgId, () =>
    prisma.donation.update({
      where: { id: donationId },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.message !== undefined && { message: data.message }),
      },
    })
  );
}

/**
 * Returns aggregate donation statistics for the org dashboard.
 * Computes totals, averages, and month-over-month trends.
 *
 * @param orgId - Organization ID
 */
export async function getDonationStats(orgId: string): Promise<DonationStats> {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  return withOrgContext(orgId, async () => {
    const [allStats, thisMonthStats, lastMonthStats] = await Promise.all([
      prisma.donation.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
        _count: { id: true },
        _avg: { amount: true },
      }),
      prisma.donation.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: { gte: startOfThisMonth },
        },
        _sum: { amount: true },
      }),
      prisma.donation.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalRaised: allStats._sum.amount ?? 0,
      donationCount: allStats._count.id ?? 0,
      averageGift: allStats._avg.amount ?? 0,
      thisMonthRaised: thisMonthStats._sum.amount ?? 0,
      lastMonthRaised: lastMonthStats._sum.amount ?? 0,
    };
  });
}

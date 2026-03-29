/**
 * Multi-tenant campaign CRUD service for ZedImpact.
 * Handles campaign lifecycle including goal tracking and slug uniqueness.
 */
import { prisma } from "@/lib/db";
import { withOrgContext } from "@/lib/org-context";
import type {
  CampaignType,
  CampaignStatus,
} from "@prisma/client";

export interface CampaignListOptions {
  page?: number;
  limit?: number;
  status?: CampaignStatus;
}

export interface CreateCampaignData {
  name: string;
  slug: string;
  description?: string | null;
  type?: CampaignType;
  status?: CampaignStatus;
  goalAmount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  imageUrl?: string | null;
}

export type UpdateCampaignData = Partial<CreateCampaignData>;

/**
 * Returns a paginated list of campaigns for the given org.
 *
 * @param orgId - Organization ID
 * @param opts - Pagination and filter options
 */
export async function listCampaigns(
  orgId: string,
  opts: CampaignListOptions = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (opts.status) {
    where.status = opts.status;
  }

  return withOrgContext(orgId, async () => {
    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          type: true,
          status: true,
          goalAmount: true,
          raisedAmount: true,
          startDate: true,
          endDate: true,
          imageUrl: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { donations: true } },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return {
      campaigns,
      meta: { page, limit, total },
    };
  });
}

/**
 * Returns a single campaign by ID with donation stats.
 *
 * @param orgId - Organization ID
 * @param campaignId - Campaign ID
 */
export async function getCampaignById(orgId: string, campaignId: string) {
  return withOrgContext(orgId, () =>
    prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        _count: { select: { donations: true } },
      },
    })
  );
}

/**
 * Returns a single campaign by slug (public-safe).
 *
 * @param orgId - Organization ID
 * @param slug - Campaign slug
 */
export async function getCampaignBySlug(orgId: string, slug: string) {
  return withOrgContext(orgId, () =>
    prisma.campaign.findFirst({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        type: true,
        status: true,
        goalAmount: true,
        raisedAmount: true,
        startDate: true,
        endDate: true,
        imageUrl: true,
        createdAt: true,
        _count: { select: { donations: true } },
      },
    })
  );
}

/**
 * Creates a new campaign. Validates slug uniqueness globally (slugs are system-unique).
 *
 * @param orgId - Organization ID
 * @param data - Campaign data
 */
export async function createCampaign(orgId: string, data: CreateCampaignData) {
  // Check slug uniqueness (@@unique on slug)
  const existing = await prisma.campaign.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`Campaign slug "${data.slug}" is already taken`);
  }

  return withOrgContext(orgId, () =>
    prisma.campaign.create({
      data: {
        organizationId: orgId,
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        type: data.type ?? "DONATION",
        status: data.status ?? "DRAFT",
        goalAmount: data.goalAmount ?? null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        imageUrl: data.imageUrl ?? null,
      },
    })
  );
}

/**
 * Partially updates a campaign.
 * If slug is changed, validates uniqueness first.
 *
 * @param orgId - Organization ID
 * @param campaignId - Campaign ID
 * @param data - Fields to update
 */
export async function updateCampaign(
  orgId: string,
  campaignId: string,
  data: UpdateCampaignData
) {
  // If slug is changing, check uniqueness
  if (data.slug) {
    const existing = await prisma.campaign.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });
    if (existing && existing.id !== campaignId) {
      throw new Error(`Campaign slug "${data.slug}" is already taken`);
    }
  }

  return withOrgContext(orgId, () =>
    prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.goalAmount !== undefined && { goalAmount: data.goalAmount }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      },
    })
  );
}

/**
 * Soft-deletes a campaign by setting status to ARCHIVED.
 * Hard-deletes if the campaign has no donations.
 *
 * @param orgId - Organization ID
 * @param campaignId - Campaign ID
 */
export async function deleteCampaign(orgId: string, campaignId: string) {
  return withOrgContext(orgId, async () => {
    const donationCount = await prisma.donation.count({
      where: { campaignId },
    });

    if (donationCount > 0) {
      // Soft delete — preserve donation history
      return prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "ARCHIVED" },
      });
    }

    return prisma.campaign.delete({ where: { id: campaignId } });
  });
}

/**
 * Increments the raisedAmount on a campaign after a donation completes.
 * Called by the Stripe webhook handler.
 *
 * @param campaignId - Campaign ID
 * @param amount - Amount to add to raisedAmount
 */
export async function incrementCampaignRaisedAmount(
  campaignId: string,
  amount: number
) {
  return prisma.campaign.update({
    where: { id: campaignId },
    data: { raisedAmount: { increment: amount } },
  });
}

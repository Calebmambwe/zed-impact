/**
 * Membership service for ZedImpact.
 * Handles membership tier CRUD and membership subscriptions.
 * Framework-agnostic — no HTTP imports.
 */
import { prisma } from "@/lib/db";
import { withOrgContext } from "@/lib/org-context";
import type { CreateMembershipTierInput } from "@/lib/validations/memberships";

export interface MembershipListOptions {
  page?: number;
  limit?: number;
}

/**
 * Returns a paginated list of membership tiers for an org.
 */
export async function listMembershipTiers(
  orgId: string,
  opts: MembershipListOptions = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  return withOrgContext(orgId, async () => {
    const [tiers, total] = await Promise.all([
      prisma.membershipTier.findMany({
        orderBy: { price: "asc" },
        skip,
        take: limit,
        include: { _count: { select: { memberships: true } } },
      }),
      prisma.membershipTier.count(),
    ]);
    return { tiers, meta: { page, limit, total } };
  });
}

/**
 * Returns a single tier by ID.
 */
export async function getMembershipTier(orgId: string, tierId: string) {
  return withOrgContext(orgId, async () => {
    return prisma.membershipTier.findUnique({
      where: { id: tierId },
      include: { _count: { select: { memberships: true } } },
    });
  });
}

/**
 * Creates a membership tier.
 */
export async function createMembershipTier(
  orgId: string,
  data: CreateMembershipTierInput
) {
  return withOrgContext(orgId, async () => {
    return prisma.membershipTier.create({
      data: {
        organizationId: orgId,
        name: data.name,
        description: data.description,
        price: data.price,
        interval: data.interval ?? "MONTHLY",
        benefits: data.benefits ? data.benefits : undefined,
        isPublished: data.isPublished ?? false,
      },
    });
  });
}

/**
 * Updates a membership tier.
 */
export async function updateMembershipTier(
  orgId: string,
  tierId: string,
  data: Partial<CreateMembershipTierInput>
) {
  return withOrgContext(orgId, async () => {
    const existing = await prisma.membershipTier.findUnique({
      where: { id: tierId },
    });
    if (!existing || existing.organizationId !== orgId) return null;

    return prisma.membershipTier.update({
      where: { id: tierId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.interval !== undefined && { interval: data.interval }),
        ...(data.benefits !== undefined && { benefits: data.benefits ?? undefined }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
    });
  });
}

/**
 * Lists memberships for an org.
 */
export async function listMemberships(
  orgId: string,
  opts: MembershipListOptions = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  return withOrgContext(orgId, async () => {
    const [memberships, total] = await Promise.all([
      prisma.membership.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { tier: { select: { name: true, interval: true } } },
      }),
      prisma.membership.count(),
    ]);
    return { memberships, meta: { page, limit, total } };
  });
}

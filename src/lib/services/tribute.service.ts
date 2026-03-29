/**
 * Tribute donation service for ZedImpact.
 * Handles in-honor and in-memory donation tribute records.
 */
import { prisma } from "@/lib/db";
import { withOrgContext } from "@/lib/org-context";
import type { TributeInput } from "@/lib/validations/donation";

/**
 * Creates a DonorTribute record linked to a donation.
 *
 * @param orgId - Organization ID
 * @param donationId - The donation being made in tribute
 * @param data - Tribute details
 */
export async function createTribute(
  orgId: string,
  donationId: string,
  data: TributeInput
) {
  return withOrgContext(orgId, async () => {
    const tribute = await prisma.donorTribute.create({
      data: {
        organizationId: orgId,
        tributeType: data.tributeType,
        tributeeName: data.tributeeName,
        notificationEmail: data.notificationEmail ?? null,
        message: data.message ?? null,
      },
    });

    // Link tribute back to the donation
    await prisma.donation.update({
      where: { id: donationId },
      data: { tributeId: tribute.id },
    });

    return tribute;
  });
}

/**
 * Retrieves the tribute record for a donation.
 *
 * @param orgId - Organization ID
 * @param donationId - Donation ID
 */
export async function getTributeByDonation(orgId: string, donationId: string) {
  return withOrgContext(orgId, async () => {
    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      select: { tributeId: true },
    });

    if (!donation?.tributeId) return null;

    return prisma.donorTribute.findUnique({
      where: { id: donation.tributeId },
    });
  });
}

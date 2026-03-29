/**
 * Milestone badge detection service for ZedImpact.
 * Detects and records 7 donor milestone achievements for a contact.
 * Uses upsert with @@unique([contactId, milestone]) to prevent duplicates.
 */
import { prisma } from "@/lib/db";
import { withOrgContext } from "@/lib/org-context";
import { createNotification } from "./notification.service";

export const MILESTONES = {
  FIRST_GIFT: "FIRST_GIFT",
  RECURRING_DONOR: "RECURRING_DONOR",
  SPONSOR: "SPONSOR",
  FIVE_HUNDRED: "FIVE_HUNDRED",
  ONE_THOUSAND: "ONE_THOUSAND",
  FIVE_YEAR_DONOR: "FIVE_YEAR_DONOR",
  LAPSED_RETURNED: "LAPSED_RETURNED",
} as const;

export type MilestoneKey = (typeof MILESTONES)[keyof typeof MILESTONES];

const MILESTONE_TITLES: Record<MilestoneKey, string> = {
  FIRST_GIFT: "First Gift",
  RECURRING_DONOR: "Recurring Donor",
  SPONSOR: "Sponsor",
  FIVE_HUNDRED: "$500 Milestone",
  ONE_THOUSAND: "$1,000 Milestone",
  FIVE_YEAR_DONOR: "Five-Year Donor",
  LAPSED_RETURNED: "Welcome Back",
};

const MILESTONE_MESSAGES: Record<MilestoneKey, string> = {
  FIRST_GIFT: "A contact made their first donation!",
  RECURRING_DONOR: "A contact started a recurring donation.",
  SPONSOR: "A contact has an active sponsorship.",
  FIVE_HUNDRED: "A contact's lifetime giving reached $500.",
  ONE_THOUSAND: "A contact's lifetime giving reached $1,000.",
  FIVE_YEAR_DONOR: "A contact has donated across 5 or more calendar years.",
  LAPSED_RETURNED: "A lapsed donor has returned after 12+ months.",
};

// ── Detectors ─────────────────────────────────────────────────────────────

/**
 * Detects FIRST_GIFT: contact has exactly one completed donation.
 */
async function detectFirstGift(orgId: string, contactId: string): Promise<boolean> {
  return withOrgContext(orgId, async () => {
    const count = await prisma.donation.count({
      where: { contactId, status: "COMPLETED" },
    });
    return count === 1;
  });
}

/**
 * Detects RECURRING_DONOR: contact has at least one active recurring donation.
 */
async function detectRecurringDonor(orgId: string, contactId: string): Promise<boolean> {
  return withOrgContext(orgId, async () => {
    const count = await prisma.donation.count({
      where: { contactId, isRecurring: true, status: "COMPLETED" },
    });
    return count > 0;
  });
}

/**
 * Detects SPONSOR: stub — returns false until Sponsorship model is fully implemented.
 */
async function detectSponsor(_orgId: string, _contactId: string): Promise<boolean> {
  // Sponsorship integration is a future milestone
  return false;
}

/**
 * Detects FIVE_HUNDRED: contact's lifetime donation value >= $500.
 */
async function detectFiveHundred(orgId: string, contactId: string): Promise<boolean> {
  return withOrgContext(orgId, async () => {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId },
      select: { lifetimeValue: true },
    });
    return (contact?.lifetimeValue ?? 0) >= 500;
  });
}

/**
 * Detects ONE_THOUSAND: contact's lifetime donation value >= $1,000.
 */
async function detectOneThousand(orgId: string, contactId: string): Promise<boolean> {
  return withOrgContext(orgId, async () => {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId },
      select: { lifetimeValue: true },
    });
    return (contact?.lifetimeValue ?? 0) >= 1000;
  });
}

/**
 * Detects FIVE_YEAR_DONOR: contact has donated in 5 or more distinct calendar years.
 */
async function detectFiveYearDonor(orgId: string, contactId: string): Promise<boolean> {
  return withOrgContext(orgId, async () => {
    const donations = await prisma.donation.findMany({
      where: { contactId, status: "COMPLETED" },
      select: { createdAt: true },
    });

    const years = new Set(donations.map((d) => d.createdAt.getFullYear()));
    return years.size >= 5;
  });
}

/**
 * Detects LAPSED_RETURNED: the most recent donation follows a 12+ month gap.
 */
async function detectLapsedReturned(orgId: string, contactId: string): Promise<boolean> {
  return withOrgContext(orgId, async () => {
    const donations = await prisma.donation.findMany({
      where: { contactId, status: "COMPLETED" },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 2,
    });

    if (donations.length < 2) return false;

    const [latest, previous] = donations;
    const gapMs = latest.createdAt.getTime() - previous.createdAt.getTime();
    const twelveMonthsMs = 12 * 30 * 24 * 60 * 60 * 1000;
    return gapMs >= twelveMonthsMs;
  });
}

// ── Main entry ────────────────────────────────────────────────────────────

/**
 * Runs all 7 milestone detectors for a contact.
 * For each newly achieved milestone (not previously recorded), creates a
 * MilestoneNotification and a Notification for the org's admin users.
 *
 * @returns Array of milestone keys that were newly achieved in this run.
 */
export async function checkMilestones(
  orgId: string,
  contactId: string
): Promise<MilestoneKey[]> {
  const detectors: Array<{
    key: MilestoneKey;
    fn: (orgId: string, contactId: string) => Promise<boolean>;
  }> = [
    { key: MILESTONES.FIRST_GIFT, fn: detectFirstGift },
    { key: MILESTONES.RECURRING_DONOR, fn: detectRecurringDonor },
    { key: MILESTONES.SPONSOR, fn: detectSponsor },
    { key: MILESTONES.FIVE_HUNDRED, fn: detectFiveHundred },
    { key: MILESTONES.ONE_THOUSAND, fn: detectOneThousand },
    { key: MILESTONES.FIVE_YEAR_DONOR, fn: detectFiveYearDonor },
    { key: MILESTONES.LAPSED_RETURNED, fn: detectLapsedReturned },
  ];

  // Load existing milestones to skip duplicates
  const existing = await withOrgContext(orgId, () =>
    prisma.milestoneNotification.findMany({
      where: { contactId },
      select: { milestone: true },
    })
  );
  const existingKeys = new Set(existing.map((m) => m.milestone));

  const achieved: MilestoneKey[] = [];

  for (const { key, fn } of detectors) {
    if (existingKeys.has(key)) continue;

    const detected = await fn(orgId, contactId);
    if (!detected) continue;

    // Record the milestone (@@unique prevents duplicates)
    await withOrgContext(orgId, () =>
      prisma.milestoneNotification.create({
        data: {
          organizationId: orgId,
          contactId,
          milestone: key,
          achievedAt: new Date(),
        },
      })
    );

    // Notify org admins
    const admins = await prisma.orgMember.findMany({
      where: {
        organizationId: orgId,
        role: { in: ["OWNER", "ADMIN"] },
      },
      select: { userId: true },
    });

    for (const admin of admins) {
      await createNotification(
        orgId,
        admin.userId,
        "milestone",
        MILESTONE_TITLES[key],
        MILESTONE_MESSAGES[key],
        { contactId, milestone: key }
      );
    }

    achieved.push(key);
  }

  return achieved;
}

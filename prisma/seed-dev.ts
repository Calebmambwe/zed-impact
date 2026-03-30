import { PrismaClient, type OrgRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding ZedImpact dev data...");

  const existingOrg = await prisma.organization.findUnique({ where: { slug: "demo-org" } });
  if (existingOrg) {
    console.log("Cleaning up existing seed data...");
    await prisma.donation.deleteMany({ where: { organizationId: existingOrg.id } });
    await prisma.eventRegistration.deleteMany({ where: { organizationId: existingOrg.id } });
    await prisma.event.deleteMany({ where: { organizationId: existingOrg.id } });
    await prisma.campaign.deleteMany({ where: { organizationId: existingOrg.id } });
    await prisma.contact.deleteMany({ where: { organizationId: existingOrg.id } });
    await prisma.orgMember.deleteMany({ where: { organizationId: existingOrg.id } });
    await prisma.auditLog.deleteMany({ where: { organizationId: existingOrg.id } });
    console.log("Cleanup complete");
  }

  const org = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: { name: "ZedImpact Demo", planTier: "PRO" },
    create: {
      id: "org-demo",
      clerkOrgId: "org_demo_local",
      name: "ZedImpact Demo",
      slug: "demo-org",
      planTier: "PRO",
      description: "A demo nonprofit organization for ZedImpact",
      website: "https://zedimpact.com",
    },
  });
  console.log("Created org:", org.name);

  const admin = await prisma.user.upsert({
    where: { email: "admin@zedimpact.org" },
    update: {},
    create: { clerkId: "user_admin_local", email: "admin@zedimpact.org", name: "Admin User", role: "ADMIN" },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@zedimpact.org" },
    update: {},
    create: { clerkId: "user_staff_local", email: "staff@zedimpact.org", name: "Staff Member", role: "USER" },
  });

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@zedimpact.org" },
    update: {},
    create: { clerkId: "user_viewer_local", email: "viewer@zedimpact.org", name: "Demo Viewer", role: "USER" },
  });

  const members: Array<{ user: typeof admin; role: OrgRole }> = [
    { user: admin, role: "OWNER" },
    { user: staff, role: "STAFF" },
    { user: viewer, role: "VIEWER" },
  ];

  for (const { user, role } of members) {
    await prisma.orgMember.upsert({
      where: { organizationId_userId: { userId: user.id, organizationId: org.id } },
      update: {},
      create: { userId: user.id, organizationId: org.id, role },
    });
  }
  console.log("Created 3 org members (owner, staff, viewer)");

  // ── Campaigns ──────────────────────────────────────────────────────────────
  const campaign1 = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      name: "Annual Fund 2025",
      slug: "annual-fund-2025",
      description: "Support our annual operations and programs.",
      type: "DONATION",
      status: "ACTIVE",
      goalAmount: 50000,
      raisedAmount: 32450,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      name: "Education Sponsorship Drive",
      slug: "education-sponsorship-2025",
      description: "Help us sponsor 50 children through school.",
      type: "DONATION",
      status: "ACTIVE",
      goalAmount: 25000,
      raisedAmount: 14800,
      startDate: new Date("2025-02-01"),
      endDate: new Date("2025-11-30"),
    },
  });

  await prisma.campaign.create({
    data: {
      organizationId: org.id,
      name: "Emergency Relief Fund",
      slug: "emergency-relief-2024",
      description: "Rapid response fund for communities in need.",
      type: "EMERGENCY",
      status: "COMPLETED",
      goalAmount: 10000,
      raisedAmount: 11250,
      startDate: new Date("2024-10-01"),
      endDate: new Date("2024-12-31"),
    },
  });
  console.log("Created 3 campaigns");

  // ── Contacts ──────────────────────────────────────────────────────────────
  const contactData = [
    { firstName: "Sarah", lastName: "Mitchell", email: "sarah.m@example.com", type: "DONOR" as const, lifetimeValue: 5200 },
    { firstName: "James", lastName: "Okonkwo", email: "james.o@example.com", type: "DONOR" as const, lifetimeValue: 3600 },
    { firstName: "Amara", lastName: "Diallo", email: "amara.d@example.com", type: "SPONSOR" as const, lifetimeValue: 7800 },
    { firstName: "Thomas", lastName: "Berg", email: "thomas.b@example.com", type: "DONOR" as const, lifetimeValue: 1200 },
    { firstName: "Lily", lastName: "Chen", email: "lily.c@example.com", type: "VOLUNTEER" as const, lifetimeValue: 0 },
    { firstName: "David", lastName: "Kamau", email: "david.k@example.com", type: "DONOR" as const, lifetimeValue: 950 },
  ];

  const contacts = [];
  for (const c of contactData) {
    const contact = await prisma.contact.create({
      data: {
        organizationId: org.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        type: c.type,
        status: "ACTIVE",
        lifetimeValue: c.lifetimeValue,
      },
    });
    contacts.push(contact);
  }
  console.log(`Created ${contacts.length} contacts`);

  // ── Donations (spread over 6 months for charts) ────────────────────────────
  const now = new Date();
  const donorPairs = [
    { name: "Sarah Mitchell", email: "sarah.m@example.com" },
    { name: "James Okonkwo", email: "james.o@example.com" },
    { name: "Amara Diallo", email: "amara.d@example.com" },
    { name: "Thomas Berg", email: "thomas.b@example.com" },
    { name: "Anonymous Donor", email: "anon1@example.com" },
    { name: "David Kamau", email: "david.k@example.com" },
  ];

  const paymentMethods = ["CARD", "CARD", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "MOBILE_MONEY"] as const;

  // Create donations spread over last 6 months
  const donations = [];
  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const baseDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const donationsThisMonth = 3 + Math.floor(monthOffset === 0 ? 4 : 2); // More recent = more donations

    for (let i = 0; i < donationsThisMonth; i++) {
      const donorIdx = (i + monthOffset) % donorPairs.length;
      const donor = donorPairs[donorIdx];
      const daysIntoMonth = 1 + Math.floor(i * 9);
      const donationDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), daysIntoMonth);
      const amounts = [25, 50, 100, 150, 250, 500, 75, 200];
      const amount = amounts[(i + monthOffset * 2) % amounts.length];

      const donation = await prisma.donation.create({
        data: {
          organizationId: org.id,
          campaignId: i % 3 === 0 ? campaign1.id : i % 3 === 1 ? campaign2.id : null,
          amount: amount ?? 100,
          currency: "USD",
          status: "COMPLETED",
          type: "ONE_TIME",
          paymentMethod: paymentMethods[donorIdx % paymentMethods.length],
          gateway: "STRIPE",
          donorName: donor.name,
          donorEmail: donor.email,
          isAnonymous: donor.name === "Anonymous Donor",
          createdAt: donationDate,
        },
      });
      donations.push(donation);
    }
  }
  console.log(`Created ${donations.length} donations across 6 months`);

  // ── Events ────────────────────────────────────────────────────────────────
  const futureBase = new Date(now.getFullYear(), now.getMonth(), 1);
  const eventsData = [
    {
      title: "Annual Gala Dinner 2026",
      slug: "annual-gala-dinner-2026",
      description: "Our flagship fundraising event of the year. Join us for an evening of celebration, storytelling, and community.",
      type: "IN_PERSON" as const,
      location: "Grand Ballroom, City Conference Center",
      startDate: new Date(futureBase.getFullYear(), futureBase.getMonth() + 1, 15, 18, 0),
      endDate: new Date(futureBase.getFullYear(), futureBase.getMonth() + 1, 15, 22, 0),
      isPublished: true,
      maxCapacity: 200,
      campaignId: campaign1.id,
    },
    {
      title: "Education Sponsor Webinar",
      slug: "education-sponsor-webinar-2026",
      description: "Meet the students you are sponsoring. Hear their stories and see the impact of your generosity.",
      type: "VIRTUAL" as const,
      virtualUrl: "https://zoom.us/j/demo",
      startDate: new Date(futureBase.getFullYear(), futureBase.getMonth(), 20, 14, 0),
      endDate: new Date(futureBase.getFullYear(), futureBase.getMonth(), 20, 15, 30),
      isPublished: true,
      maxCapacity: 100,
      campaignId: campaign2.id,
    },
    {
      title: "Community Volunteer Day",
      slug: "community-volunteer-day-2026",
      description: "Roll up your sleeves and make a direct impact. No experience needed — just bring your enthusiasm.",
      type: "IN_PERSON" as const,
      location: "Riverside Community Park",
      startDate: new Date(futureBase.getFullYear(), futureBase.getMonth() + 2, 8, 9, 0),
      endDate: new Date(futureBase.getFullYear(), futureBase.getMonth() + 2, 8, 16, 0),
      isPublished: true,
      maxCapacity: 50,
    },
    {
      title: "Year-End Donor Appreciation",
      slug: "year-end-donor-appreciation-2026",
      description: "A hybrid event to thank our top donors and share the impact report for the year.",
      type: "HYBRID" as const,
      location: "ZedImpact HQ",
      virtualUrl: "https://meet.google.com/demo",
      startDate: new Date(futureBase.getFullYear(), futureBase.getMonth() + 3, 10, 17, 0),
      endDate: new Date(futureBase.getFullYear(), futureBase.getMonth() + 3, 10, 19, 0),
      isPublished: false,
    },
  ];

  for (const e of eventsData) {
    await prisma.event.create({
      data: { organizationId: org.id, ...e },
    });
  }
  console.log(`Created ${eventsData.length} events`);

  // Summary
  const totalRaised = donations.reduce((sum, d) => sum + d.amount, 0);
  console.log(`\nSeed complete!`);
  console.log(`  Total raised (seed): $${totalRaised.toLocaleString()}`);
  console.log(`  Access at: http://localhost:3003/demo-org/admin`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });

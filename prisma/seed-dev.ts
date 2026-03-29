import { PrismaClient, type OrgRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding ZedImpact dev data...");

  const existingOrg = await prisma.organization.findUnique({ where: { slug: "demo-org" } });
  if (existingOrg) {
    console.log("Cleaning up existing seed data...");
    await prisma.orgMember.deleteMany({ where: { organizationId: existingOrg.id } });
    await prisma.auditLog.deleteMany({ where: { organizationId: existingOrg.id } });
    console.log("Cleanup complete");
  }

  const org = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: {
      id: "org-demo",
      clerkOrgId: "org_demo_local",
      name: "ZedImpact Demo",
      slug: "demo-org",
      planTier: "PRO",
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
  console.log("\nSeed complete! Access at http://localhost:3000/demo-org/admin");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });

import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export default async function DashboardRedirect() {
  const skipAuth = process.env.SKIP_AUTH === "true";

  if (!skipAuth) {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    let user = await prisma.user.findUnique({ where: { clerkId: userId } });

    if (!user) {
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? `${userId}@unknown`;
      const name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null;

      const existingByEmail = await prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        user = await prisma.user.update({
          where: { email },
          data: { clerkId: userId, name: name ?? existingByEmail.name },
        });
      } else {
        user = await prisma.user.create({
          data: { clerkId: userId, email, name },
        });
      }
    }

    const membership = await prisma.orgMember.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: { organization: { select: { slug: true } } },
    });

    if (membership) {
      const orgSlug = membership.organization.slug;
      const adminRoles = ["OWNER", "ADMIN", "MANAGER", "STAFF"];
      if (adminRoles.includes(membership.role)) {
        redirect(`/${orgSlug}/admin`);
      }
      redirect(`/${orgSlug}/portal/dashboard`);
    }
  } else {
    const org = await prisma.organization.findFirst({ select: { slug: true } });
    if (org) redirect(`/${org.slug}/admin`);
  }

  redirect("/onboarding");
}

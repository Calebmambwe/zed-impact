import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/org-auth";
import { withOrgContext } from "@/lib/org-context";
import { DashboardKpiCards } from "@/components/admin/DashboardKpiCards";
import { DashboardCharts } from "@/components/admin/DashboardCharts";

interface AdminDashboardProps {
  params: Promise<{ orgSlug: string }>;
}

async function getDashboardStats(orgSlug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, name: true },
  });

  if (!org) return null;

  const orgId = org.id;

  const [totalRaisedResult, donationCount, campaignCount, recentDonations] =
    await Promise.all([
      withOrgContext(orgId, () =>
        prisma.donation.aggregate({
          _sum: { amount: true },
          where: { organizationId: orgId, status: "COMPLETED" },
        })
      ),
      withOrgContext(orgId, () =>
        prisma.donation.count({
          where: { organizationId: orgId, status: "COMPLETED" },
        })
      ),
      withOrgContext(orgId, () =>
        prisma.campaign.count({
          where: { organizationId: orgId, status: "ACTIVE" },
        })
      ),
      withOrgContext(orgId, () =>
        prisma.donation.findMany({
          where: { organizationId: orgId, status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            amount: true,
            currency: true,
            donorName: true,
            createdAt: true,
          },
        })
      ),
    ]);

  const activeDonors = await withOrgContext(orgId, () =>
    prisma.donation
      .groupBy({
        by: ["donorEmail"],
        where: {
          organizationId: orgId,
          status: "COMPLETED",
          donorEmail: { gt: "" },
        },
      })
      .then((r) => r.length)
  );

  // Build monthly data for last 6 months
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthlyRaw = await withOrgContext(orgId, () =>
    prisma.donation.findMany({
      where: {
        organizationId: orgId,
        status: "COMPLETED",
        createdAt: { gte: sixMonthsAgo },
      },
      select: { amount: true, createdAt: true },
    })
  );

  const monthlyMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("en-US", { month: "short" });
    monthlyMap.set(key, 0);
  }
  for (const d of monthlyRaw) {
    const key = d.createdAt.toLocaleString("en-US", { month: "short" });
    if (monthlyMap.has(key)) {
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + d.amount);
    }
  }
  const monthlyData = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
    month,
    amount,
  }));

  // Payment methods breakdown
  const paymentMethodRaw = await withOrgContext(orgId, () =>
    prisma.donation.groupBy({
      by: ["paymentMethod"],
      where: { organizationId: orgId, status: "COMPLETED" },
      _count: { id: true },
    })
  );

  const COLOR_MAP: Record<string, string> = {
    CARD: "#22c55e",
    MOBILE_MONEY: "#3b82f6",
    BANK_TRANSFER: "#f59e0b",
    CASH: "#8b5cf6",
  };

  const paymentMethodData = paymentMethodRaw.map((r) => ({
    name:
      r.paymentMethod === "MOBILE_MONEY"
        ? "Mobile Money"
        : r.paymentMethod === "CARD"
        ? "Card"
        : r.paymentMethod === "BANK_TRANSFER"
        ? "Bank Transfer"
        : r.paymentMethod ?? "Other",
    value: r._count.id,
    color: COLOR_MAP[r.paymentMethod ?? ""] ?? "#6b7280",
  }));

  const totalRaised = totalRaisedResult._sum.amount ?? 0;

  return {
    org,
    totalRaised,
    donationCount,
    activeDonors,
    campaignCount,
    monthlyData,
    paymentMethodData,
    recentDonations: recentDonations.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    })),
  };
}

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

export default async function AdminDashboard({ params }: AdminDashboardProps) {
  const { orgSlug } = await params;

  let stats = null;
  try {
    await getAuthenticatedUser();
    stats = await getDashboardStats(orgSlug);
  } catch {
    // Unauthenticated — show empty state
  }

  const kpiStats = [
    {
      label: "Total Raised",
      value: stats ? formatCurrency(stats.totalRaised) : "$0",
      icon: "DollarSign",
      iconBg: "bg-emerald-500",
    },
    {
      label: "Donations",
      value: stats ? stats.donationCount.toLocaleString() : "0",
      icon: "Heart",
      iconBg: "bg-rose-500",
    },
    {
      label: "Active Donors",
      value: stats ? stats.activeDonors.toLocaleString() : "0",
      icon: "Users",
      iconBg: "bg-blue-500",
    },
    {
      label: "Campaigns",
      value: stats ? stats.campaignCount.toLocaleString() : "0",
      icon: "Target",
      iconBg: "bg-amber-500",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Welcome to ZedImpact &mdash; {stats?.org.name ?? orgSlug}
      </p>

      <div className="space-y-6">
        <DashboardKpiCards stats={kpiStats} />

        <DashboardCharts
          monthlyData={stats?.monthlyData ?? []}
          paymentMethodData={stats?.paymentMethodData ?? []}
          recentDonations={stats?.recentDonations ?? []}
        />
      </div>
    </div>
  );
}

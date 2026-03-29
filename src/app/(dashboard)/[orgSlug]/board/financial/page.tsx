import { prisma } from "@/lib/db";
import { withOrgContext } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, CreditCard, ArrowUpRight } from "lucide-react";

interface BoardFinancialProps {
  params: Promise<{ orgSlug: string }>;
}

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

async function getFinancialData(orgSlug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, name: true },
  });
  if (!org) return null;

  const orgId = org.id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    totalRaised,
    thisMonthRaised,
    lastMonthRaised,
    yearToDateRaised,
    recurringRevenue,
    recentDonations,
    topCampaigns,
  ] = await Promise.all([
    withOrgContext(orgId, () =>
      prisma.donation
        .aggregate({
          _sum: { amount: true },
          where: { organizationId: orgId, status: "COMPLETED" },
        })
        .then((r) => r._sum.amount ?? 0)
    ),
    withOrgContext(orgId, () =>
      prisma.donation
        .aggregate({
          _sum: { amount: true },
          where: {
            organizationId: orgId,
            status: "COMPLETED",
            createdAt: { gte: startOfMonth },
          },
        })
        .then((r) => r._sum.amount ?? 0)
    ),
    withOrgContext(orgId, () =>
      prisma.donation
        .aggregate({
          _sum: { amount: true },
          where: {
            organizationId: orgId,
            status: "COMPLETED",
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          },
        })
        .then((r) => r._sum.amount ?? 0)
    ),
    withOrgContext(orgId, () =>
      prisma.donation
        .aggregate({
          _sum: { amount: true },
          where: {
            organizationId: orgId,
            status: "COMPLETED",
            createdAt: { gte: startOfYear },
          },
        })
        .then((r) => r._sum.amount ?? 0)
    ),
    withOrgContext(orgId, () =>
      prisma.donation
        .aggregate({
          _sum: { amount: true },
          where: {
            organizationId: orgId,
            status: "COMPLETED",
            type: "RECURRING",
          },
        })
        .then((r) => r._sum.amount ?? 0)
    ),
    withOrgContext(orgId, () =>
      prisma.donation.findMany({
        where: { organizationId: orgId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          amount: true,
          type: true,
          paymentMethod: true,
          createdAt: true,
          campaign: { select: { name: true } },
        },
      })
    ),
    withOrgContext(orgId, () =>
      prisma.campaign.findMany({
        where: { organizationId: orgId, status: "ACTIVE" },
        orderBy: { raisedAmount: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          raisedAmount: true,
          goalAmount: true,
        },
      })
    ),
  ]);

  const monthOverMonth =
    lastMonthRaised > 0
      ? ((thisMonthRaised - lastMonthRaised) / lastMonthRaised) * 100
      : 0;

  return {
    org,
    totalRaised,
    thisMonthRaised,
    lastMonthRaised,
    yearToDateRaised,
    recurringRevenue,
    monthOverMonth,
    recentDonations,
    topCampaigns,
  };
}

export default async function BoardFinancialPage({ params }: BoardFinancialProps) {
  const { orgSlug } = await params;
  const data = await getFinancialData(orgSlug).catch(() => null);

  const summaryCards = [
    {
      label: "Total Raised (All Time)",
      value: data ? formatCurrency(data.totalRaised) : "$0",
      icon: DollarSign,
      iconBg: "bg-emerald-500",
    },
    {
      label: "This Month",
      value: data ? formatCurrency(data.thisMonthRaised) : "$0",
      icon: TrendingUp,
      iconBg: "bg-blue-500",
      sub: data
        ? `${data.monthOverMonth >= 0 ? "+" : ""}${data.monthOverMonth.toFixed(1)}% vs last month`
        : undefined,
    },
    {
      label: "Year to Date",
      value: data ? formatCurrency(data.yearToDateRaised) : "$0",
      icon: ArrowUpRight,
      iconBg: "bg-amber-500",
    },
    {
      label: "Recurring Revenue",
      value: data ? formatCurrency(data.recurringRevenue) : "$0",
      icon: CreditCard,
      iconBg: "bg-rose-500",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Financial Overview</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {data?.org.name ?? orgSlug} — revenue and donation breakdown
      </p>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  {card.sub && (
                    <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                  )}
                </div>
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-sm text-white ${card.iconBg}`}
                >
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent donations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent donations</CardTitle>
          </CardHeader>
          <CardContent>
            {!data || data.recentDonations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No donations yet
              </p>
            ) : (
              <div className="divide-y divide-border">
                {data.recentDonations.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {d.campaign?.name ?? "General donation"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d.type === "RECURRING" ? "Recurring" : "One-time"} ·{" "}
                        {new Date(d.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(d.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top campaigns */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top active campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {!data || data.topCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No active campaigns
              </p>
            ) : (
              <div className="space-y-4">
                {data.topCampaigns.map((c) => {
                  const pct =
                    c.goalAmount && c.goalAmount > 0
                      ? Math.min(100, (c.raisedAmount / c.goalAmount) * 100)
                      : null;
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="font-medium text-foreground truncate max-w-[60%]">
                          {c.name}
                        </span>
                        <span className="text-muted-foreground">
                          {formatCurrency(c.raisedAmount)}
                          {c.goalAmount ? ` / ${formatCurrency(c.goalAmount)}` : ""}
                        </span>
                      </div>
                      {pct !== null && (
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

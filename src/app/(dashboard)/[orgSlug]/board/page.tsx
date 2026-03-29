import { prisma } from "@/lib/db";
import { withOrgContext } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Heart, Users, Target } from "lucide-react";

interface BoardOverviewProps {
  params: Promise<{ orgSlug: string }>;
}

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

async function getBoardStats(orgSlug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, name: true },
  });
  if (!org) return null;

  const orgId = org.id;

  const [totalRaised, donationCount, campaignCount, activeSponsorships] =
    await Promise.all([
      withOrgContext(orgId, () =>
        prisma.donation
          .aggregate({
            _sum: { amount: true },
            where: { organizationId: orgId, status: "COMPLETED" },
          })
          .then((r) => r._sum.amount ?? 0)
      ),
      withOrgContext(orgId, () =>
        prisma.donation.count({
          where: { organizationId: orgId, status: "COMPLETED" },
        })
      ),
      withOrgContext(orgId, () =>
        prisma.campaign.count({ where: { organizationId: orgId, status: "ACTIVE" } })
      ),
      withOrgContext(orgId, () =>
        prisma.sponsorship.count({ where: { organizationId: orgId, status: "ACTIVE" } })
      ),
    ]);

  return { org, totalRaised, donationCount, campaignCount, activeSponsorships };
}

export default async function BoardOverviewPage({ params }: BoardOverviewProps) {
  const { orgSlug } = await params;
  const stats = await getBoardStats(orgSlug).catch(() => null);

  const kpis = [
    {
      label: "Total Raised",
      value: stats ? formatCurrency(stats.totalRaised) : "$0",
      icon: DollarSign,
      iconBg: "bg-emerald-500",
    },
    {
      label: "Donations",
      value: stats ? stats.donationCount.toLocaleString() : "0",
      icon: Heart,
      iconBg: "bg-rose-500",
    },
    {
      label: "Active Campaigns",
      value: stats ? stats.campaignCount.toLocaleString() : "0",
      icon: Target,
      iconBg: "bg-amber-500",
    },
    {
      label: "Sponsorships",
      value: stats ? stats.activeSponsorships.toLocaleString() : "0",
      icon: Users,
      iconBg: "bg-blue-500",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Board Overview</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {stats?.org.name ?? orgSlug} — high-level performance summary
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                </div>
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-sm text-white ${kpi.iconBg}`}
                >
                  <kpi.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Organizational health</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {[
                { label: "Total funds raised", value: stats ? formatCurrency(stats.totalRaised) : "$0" },
                { label: "Active campaigns", value: stats?.campaignCount ?? 0 },
                { label: "Active sponsorships", value: stats?.activeSponsorships ?? 0 },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className="font-medium text-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Board notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This board portal provides a read-only view of organizational performance
              metrics. For detailed financials, program data, and supporter information,
              use the navigation above.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { prisma } from "@/lib/db";
import { withOrgContext } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, Users, Heart, BookOpen } from "lucide-react";

interface BoardProgramsProps {
  params: Promise<{ orgSlug: string }>;
}

async function getProgramsData(orgSlug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, name: true },
  });
  if (!org) return null;

  const orgId = org.id;

  const [programs, totalChildren, totalSponsorships, activeCampaigns] =
    await Promise.all([
      withOrgContext(orgId, () =>
        prisma.program.findMany({
          where: { organizationId: orgId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            description: true,
            goalAmount: true,
            childCount: true,
            createdAt: true,
          },
        })
      ),
      withOrgContext(orgId, () =>
        prisma.child.count({ where: { organizationId: orgId } })
      ),
      withOrgContext(orgId, () =>
        prisma.sponsorship.count({
          where: { organizationId: orgId, status: "ACTIVE" },
        })
      ),
      withOrgContext(orgId, () =>
        prisma.campaign.count({
          where: { organizationId: orgId, status: "ACTIVE" },
        })
      ),
    ]);

  return {
    org,
    programs,
    totalChildren,
    totalSponsorships,
    activeCampaigns,
  };
}

export default async function BoardProgramsPage({ params }: BoardProgramsProps) {
  const { orgSlug } = await params;
  const data = await getProgramsData(orgSlug).catch(() => null);

  const overviewCards = [
    {
      label: "Programs",
      value: data ? data.programs.length.toString() : "0",
      icon: Folder,
      iconBg: "bg-amber-500",
    },
    {
      label: "Children Enrolled",
      value: data ? data.totalChildren.toLocaleString() : "0",
      icon: Users,
      iconBg: "bg-blue-500",
    },
    {
      label: "Active Sponsorships",
      value: data ? data.totalSponsorships.toLocaleString() : "0",
      icon: Heart,
      iconBg: "bg-rose-500",
    },
    {
      label: "Active Campaigns",
      value: data ? data.activeCampaigns.toLocaleString() : "0",
      icon: BookOpen,
      iconBg: "bg-emerald-500",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Programs</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {data?.org.name ?? orgSlug} — program reach and enrollment metrics
      </p>

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {overviewCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
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

      {/* Programs list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">All programs</CardTitle>
        </CardHeader>
        <CardContent>
          {!data || data.programs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Folder className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">No programs yet</p>
              <p className="text-xs text-muted-foreground">
                Programs will appear here once created
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.programs.map((program) => (
                <div key={program.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10">
                          <Folder className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {program.name}
                        </h3>
                      </div>
                      {program.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed ml-9 line-clamp-2">
                          {program.description}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {program.childCount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">children</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

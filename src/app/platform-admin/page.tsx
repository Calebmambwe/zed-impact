import { prisma } from "@/lib/db";
import { Building2, Users, CheckCircle } from "lucide-react";

/**
 * Platform admin dashboard — aggregate stats across all organizations.
 */
export default async function PlatformAdminDashboard() {
  const [orgCount, userCount, freeCount, proCount, enterpriseCount] =
    await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.organization.count({ where: { planTier: "FREE" } }),
      prisma.organization.count({ where: { planTier: "PRO" } }),
      prisma.organization.count({ where: { planTier: "ENTERPRISE" } }),
    ]);

  const stats = [
    {
      label: "Total Organizations",
      value: orgCount,
      icon: Building2,
      color: "bg-emerald-500",
    },
    {
      label: "Total Users",
      value: userCount,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      label: "Free Plan",
      value: freeCount,
      icon: CheckCircle,
      color: "bg-gray-400",
    },
    {
      label: "Pro Plan",
      value: proCount,
      icon: CheckCircle,
      color: "bg-violet-500",
    },
    {
      label: "Enterprise",
      value: enterpriseCount,
      icon: CheckCircle,
      color: "bg-amber-500",
    },
  ];

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold tracking-tight">Dashboard</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-lg border bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${color} shadow-sm`}
              >
                <Icon className="h-4 w-4 text-white" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

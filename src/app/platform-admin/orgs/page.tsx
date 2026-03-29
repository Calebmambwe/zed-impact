import Link from "next/link";
import { prisma } from "@/lib/db";
import { Building2 } from "lucide-react";

/**
 * Platform admin — organizations table.
 * Lists every org with member count and plan tier.
 */
export default async function PlatformAdminOrgsPage() {
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      planTier: true,
      createdAt: true,
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const planBadge: Record<string, string> = {
    FREE: "bg-gray-100 text-gray-700",
    PRO: "bg-violet-100 text-violet-700",
    ENTERPRISE: "bg-amber-100 text-amber-700",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Organizations</h2>
        <span className="text-sm text-muted-foreground">
          {orgs.length} total
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Organization
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Slug
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Plan
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Members
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Created
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {orgs.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  <Building2 className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  No organizations yet
                </td>
              </tr>
            )}
            {orgs.map((org) => (
              <tr key={org.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">{org.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {org.slug}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${planBadge[org.planTier] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {org.planTier}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {org._count.members}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {org.createdAt.toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/platform-admin/orgs/${org.id}`}
                    className="text-primary hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

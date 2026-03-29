import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ArrowLeft, Users } from "lucide-react";

interface Props {
  params: Promise<{ orgId: string }>;
}

/**
 * Platform admin — single org detail with member list.
 */
export default async function PlatformAdminOrgDetailPage({ params }: Props) {
  const { orgId } = await params;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { members: true } },
    },
  });

  if (!org) notFound();

  const planBadge: Record<string, string> = {
    FREE: "bg-gray-100 text-gray-700",
    PRO: "bg-violet-100 text-violet-700",
    ENTERPRISE: "bg-amber-100 text-amber-700",
  };

  const roleBadge: Record<string, string> = {
    OWNER: "bg-emerald-100 text-emerald-700",
    ADMIN: "bg-blue-100 text-blue-700",
    MANAGER: "bg-indigo-100 text-indigo-700",
    STAFF: "bg-gray-100 text-gray-600",
    VIEWER: "bg-gray-50 text-gray-500",
  };

  return (
    <div className="max-w-4xl">
      <Link
        href="/platform-admin/orgs"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to organizations
      </Link>

      {/* Org header */}
      <div className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{org.name}</h2>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {org.slug}
            </p>
            {org.description && (
              <p className="mt-2 text-sm text-muted-foreground">
                {org.description}
              </p>
            )}
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${planBadge[org.planTier] ?? "bg-gray-100 text-gray-700"}`}
          >
            {org.planTier}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Members</dt>
            <dd className="font-semibold">{org._count.members}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd className="font-semibold">
              {org.createdAt.toLocaleDateString()}
            </dd>
          </div>
          {org.website && (
            <div>
              <dt className="text-muted-foreground">Website</dt>
              <dd>
                <a
                  href={org.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {org.website}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Members table */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Users className="h-5 w-5 text-muted-foreground" />
          Members
        </h3>
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {org.members.map((member) => (
                <tr
                  key={member.id}
                  className="transition-colors hover:bg-muted/20"
                >
                  <td className="px-4 py-3 font-medium">
                    {member.user.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {member.user.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge[member.role] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {member.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

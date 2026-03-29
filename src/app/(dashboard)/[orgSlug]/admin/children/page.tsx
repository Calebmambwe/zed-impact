"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Baby, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  age: number | null;
  gender: string | null;
  program: { id: string; name: string } | null;
  isAvailable: boolean;
  location: string | null;
}

interface ChildrenResponse {
  success: boolean;
  data: { children: Child[] } | null;
  error: { code: string; message: string } | null;
  meta?: { page: number; limit: number; total: number };
}

async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

function AvailabilityBadge({ available }: { available: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        available
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {available ? "Available" : "Sponsored"}
    </span>
  );
}

export default function ChildrenPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async (id: string, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${id}/children?page=${page}&limit=20`);
      if (res.status === 401 || res.status === 403) {
        router.push(`/${orgSlug}/admin`);
        return;
      }
      if (res.status === 404) {
        setChildren([]);
        setLoading(false);
        return;
      }
      const json = await res.json() as ChildrenResponse;
      if (!json.success || !json.data) {
        setError(json.error?.message ?? "Failed to load children");
        return;
      }
      setChildren(json.data.children);
      setMeta(json.meta ?? null);
    } catch {
      setError("Failed to load children");
    } finally {
      setLoading(false);
    }
  }, [orgSlug, router]);

  useEffect(() => {
    resolveOrgId(orgSlug).then((id) => {
      if (!id) {
        setError("Organization not found");
        setLoading(false);
        return;
      }
      setOrgId(id);
      fetchChildren(id);
    });
  }, [orgSlug, fetchChildren]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Children</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage children enrolled in sponsorship programs
          </p>
        </div>
        <Link href={`/${orgSlug}/admin/children/new`}>
          <Button>
            <Plus className="h-4 w-4" />
            Add Child
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Baby className="h-4 w-4" />
            All Children
            {meta && (
              <span className="text-muted-foreground font-normal">
                ({meta.total.toLocaleString()} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="py-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading children…
            </div>
          )}
          {!loading && error && (
            <div className="py-16 text-center text-sm text-destructive">{error}</div>
          )}
          {!loading && !error && children.length === 0 && (
            <div className="py-16 text-center">
              <Baby className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No children yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add the first child to your sponsorship program.
              </p>
              <Link href={`/${orgSlug}/admin/children/new`} className="mt-4 inline-block">
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  Add Child
                </Button>
              </Link>
            </div>
          )}
          {!loading && !error && children.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                      Age
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      Program
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Availability
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {children.map((child) => (
                    <tr
                      key={child.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => router.push(`/${orgSlug}/admin/children/${child.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {child.firstName} {child.lastName}
                        </div>
                        {child.gender && (
                          <div className="text-xs text-muted-foreground capitalize">
                            {child.gender.toLowerCase()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        {child.age != null ? `${child.age} yrs` : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {child.program?.name ?? <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {child.location ?? <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <AvailabilityBadge available={child.isAvailable} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {meta && meta.total > meta.limit && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Page {meta.page} of {Math.ceil(meta.total / meta.limit)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={meta.page <= 1}
                      onClick={() => orgId && fetchChildren(orgId, meta.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={meta.page >= Math.ceil(meta.total / meta.limit)}
                      onClick={() => orgId && fetchChildren(orgId, meta.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

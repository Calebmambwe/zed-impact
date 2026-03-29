"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface School {
  id: string;
  name: string;
  location: string | null;
  type: string;
  _count?: { children: number };
}

interface SchoolsResponse {
  success: boolean;
  data: School[] | null;
  error: { code: string; message: string } | null;
  meta?: { page: number; limit: number; total: number };
}

async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

function schoolTypeBadge(type: string) {
  const styles: Record<string, string> = {
    PRIMARY: "bg-blue-100 text-blue-700",
    SECONDARY: "bg-purple-100 text-purple-700",
    TERTIARY: "bg-amber-100 text-amber-700",
    VOCATIONAL: "bg-orange-100 text-orange-700",
    OTHER: "bg-gray-100 text-gray-600",
  };
  const labels: Record<string, string> = {
    PRIMARY: "Primary",
    SECONDARY: "Secondary",
    TERTIARY: "Tertiary",
    VOCATIONAL: "Vocational",
    OTHER: "Other",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[type] ?? "bg-muted text-muted-foreground"}`}
    >
      {labels[type] ?? type}
    </span>
  );
}

export default function SchoolsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchools = useCallback(async (id: string, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${id}/schools?page=${page}&limit=20`);
      if (res.status === 401 || res.status === 403) {
        router.push(`/${orgSlug}/admin`);
        return;
      }
      if (res.status === 404) {
        setSchools([]);
        setLoading(false);
        return;
      }
      const json = await res.json() as SchoolsResponse;
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load schools");
        return;
      }
      setSchools(json.data ?? []);
      setMeta(json.meta ?? null);
    } catch {
      setError("Failed to load schools");
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
      fetchSchools(id);
    });
  }, [orgSlug, fetchSchools]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schools</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Partner schools where sponsored children study
          </p>
        </div>
        <Link href={`/${orgSlug}/admin/schools/new`}>
          <Button>
            <Plus className="h-4 w-4" />
            Add School
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            All Schools
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
              Loading schools…
            </div>
          )}
          {!loading && error && (
            <div className="py-16 text-center text-sm text-destructive">{error}</div>
          )}
          {!loading && !error && schools.length === 0 && (
            <div className="py-16 text-center">
              <GraduationCap className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No schools yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add partner schools to link with sponsored children.
              </p>
              <Link href={`/${orgSlug}/admin/schools/new`} className="mt-4 inline-block">
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  Add School
                </Button>
              </Link>
            </div>
          )}
          {!loading && !error && schools.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      Children
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {schools.map((school) => (
                    <tr
                      key={school.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => router.push(`/${orgSlug}/admin/schools/${school.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{school.name}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        {school.location ?? <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3">{schoolTypeBadge(school.type)}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {school._count?.children ?? 0}
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
                      onClick={() => orgId && fetchSchools(orgId, meta.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={meta.page >= Math.ceil(meta.total / meta.limit)}
                      onClick={() => orgId && fetchSchools(orgId, meta.page + 1)}
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

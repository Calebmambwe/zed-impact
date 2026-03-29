"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Folder, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Program {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sponsorshipAmount: number | null;
  _count?: { children: number };
}

interface ProgramsResponse {
  success: boolean;
  data: Program[] | null;
  error: { code: string; message: string } | null;
  meta?: { page: number; limit: number; total: number };
}

async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ProgramsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrograms = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${id}/programs?limit=100`);
      if (res.status === 401 || res.status === 403) {
        router.push(`/${orgSlug}/admin`);
        return;
      }
      if (res.status === 404) {
        setPrograms([]);
        setLoading(false);
        return;
      }
      const json = await res.json() as ProgramsResponse;
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load programs");
        return;
      }
      setPrograms(json.data ?? []);
    } catch {
      setError("Failed to load programs");
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
      fetchPrograms(id);
    });
  }, [orgSlug, fetchPrograms]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Programs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage sponsorship programs and their enrolled children
          </p>
        </div>
        <Link href={`/${orgSlug}/admin/programs/new`}>
          <Button>
            <Plus className="h-4 w-4" />
            New Program
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="py-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading programs…
        </div>
      )}

      {!loading && error && (
        <div className="py-16 text-center text-sm text-destructive">{error}</div>
      )}

      {!loading && !error && programs.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Folder className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No programs yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create a program to group children by sponsorship type.
            </p>
            <Link href={`/${orgSlug}/admin/programs/new`} className="mt-4 inline-block">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" />
                New Program
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!loading && !error && programs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {programs.map((program) => (
            <Card
              key={program.id}
              className="hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => router.push(`/${orgSlug}/admin/programs/${program.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                        <Folder className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-sm truncate">{program.name}</CardTitle>
                    </div>
                    {program.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {program.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${
                      program.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {program.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {program._count?.children ?? 0} children enrolled
                  </span>
                  {program.sponsorshipAmount != null && (
                    <span className="font-medium text-foreground">
                      {formatCurrency(program.sponsorshipAmount)}/mo
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

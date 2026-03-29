"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { HandHeart, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Sponsorship {
  id: string;
  child: { id: string; firstName: string; lastName: string } | null;
  sponsor: { id: string; firstName: string; lastName: string; email: string | null } | null;
  status: string;
  monthlyAmount: number;
  currency: string;
  startDate: string | null;
}

interface SponsorshipsResponse {
  success: boolean;
  data: { sponsorships: Sponsorship[] } | null;
  error: { code: string; message: string } | null;
  meta?: { page: number; limit: number; total: number };
}

async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    PAUSED: "bg-yellow-100 text-yellow-700",
    CANCELLED: "bg-gray-100 text-gray-500",
    PENDING: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-purple-100 text-purple-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default function SponsorshipsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSponsorships = useCallback(async (id: string, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${id}/sponsorships?page=${page}&limit=20`);
      if (res.status === 401 || res.status === 403) {
        router.push(`/${orgSlug}/admin`);
        return;
      }
      if (res.status === 404) {
        setSponsorships([]);
        setLoading(false);
        return;
      }
      const json = await res.json() as SponsorshipsResponse;
      if (!json.success || !json.data) {
        setError(json.error?.message ?? "Failed to load sponsorships");
        return;
      }
      setSponsorships(json.data.sponsorships);
      setMeta(json.meta ?? null);
    } catch {
      setError("Failed to load sponsorships");
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
      fetchSponsorships(id);
    });
  }, [orgSlug, fetchSponsorships]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sponsorships</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track active and historical child sponsorships
          </p>
        </div>
        <Link href={`/${orgSlug}/admin/sponsorships/new`}>
          <Button>
            <Plus className="h-4 w-4" />
            New Sponsorship
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <HandHeart className="h-4 w-4" />
            All Sponsorships
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
              Loading sponsorships…
            </div>
          )}
          {!loading && error && (
            <div className="py-16 text-center text-sm text-destructive">{error}</div>
          )}
          {!loading && !error && sponsorships.length === 0 && (
            <div className="py-16 text-center">
              <HandHeart className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No sponsorships yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sponsorships will appear here when sponsors connect with children.
              </p>
            </div>
          )}
          {!loading && !error && sponsorships.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Child
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                      Sponsor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      Amount / mo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                      Started
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sponsorships.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {s.child
                          ? `${s.child.firstName} ${s.child.lastName}`
                          : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {s.sponsor ? (
                          <div>
                            <div className="font-medium text-foreground">
                              {s.sponsor.firstName} {s.sponsor.lastName}
                            </div>
                            {s.sponsor.email && (
                              <div className="text-xs text-muted-foreground">{s.sponsor.email}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{statusBadge(s.status)}</td>
                      <td className="px-4 py-3 hidden md:table-cell font-semibold text-foreground">
                        {formatCurrency(s.monthlyAmount, s.currency)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {s.startDate
                          ? new Date(s.startDate).toLocaleDateString()
                          : <span className="text-muted-foreground/50">—</span>}
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
                      onClick={() => orgId && fetchSponsorships(orgId, meta.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={meta.page >= Math.ceil(meta.total / meta.limit)}
                      onClick={() => orgId && fetchSponsorships(orgId, meta.page + 1)}
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

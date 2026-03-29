"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Plus, TrendingUp, Users, DollarSign, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DonationStats {
  totalRaised: number;
  donationCount: number;
  averageGift: number;
  thisMonthRaised: number;
  lastMonthRaised: number;
}

interface Donation {
  id: string;
  donorName: string;
  donorEmail: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  isAnonymous: boolean;
  createdAt: string;
  campaign?: { id: string; name: string; slug: string } | null;
}

interface DonationsResponse {
  success: boolean;
  data: {
    donations: Donation[];
    stats: DonationStats;
  } | null;
  error: { code: string; message: string } | null;
  meta?: { page: number; limit: number; total: number };
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
    COMPLETED: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    FAILED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-600",
    REFUNDED: "bg-blue-100 text-blue-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

/** Resolves orgId from orgSlug via the public org API. */
async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

export default function DonationsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState<DonationStats | null>(null);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDonations = useCallback(async (id: string, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${id}/donations?page=${page}&limit=20`);
      if (res.status === 401 || res.status === 403) {
        router.push(`/${orgSlug}/admin`);
        return;
      }
      const json = await res.json() as DonationsResponse;
      if (!json.success || !json.data) {
        setError(json.error?.message ?? "Failed to load donations");
        return;
      }
      setDonations(json.data.donations);
      setStats(json.data.stats);
      setMeta(json.meta ?? null);
    } catch {
      setError("Failed to load donations");
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
      fetchDonations(id);
    });
  }, [orgSlug, fetchDonations]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Donations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track and manage all donations for your organization
          </p>
        </div>
        <Link href={`/${orgSlug}/admin/donations/new`}>
          <Button>
            <Plus className="h-4 w-4" />
            Record Donation
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Raised",
            value: stats ? formatCurrency(stats.totalRaised) : "—",
            icon: DollarSign,
          },
          {
            label: "Donations",
            value: stats ? stats.donationCount.toLocaleString() : "—",
            icon: Heart,
          },
          {
            label: "Average Gift",
            value: stats ? formatCurrency(stats.averageGift) : "—",
            icon: TrendingUp,
          },
          {
            label: "This Month",
            value: stats ? formatCurrency(stats.thisMonthRaised) : "—",
            icon: Calendar,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {stat.label}
                </p>
                <stat.icon className="h-4 w-4 text-muted-foreground/60" />
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Donations
            {meta && (
              <span className="text-muted-foreground font-normal">
                ({meta.total.toLocaleString()} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Loading donations...
            </div>
          )}
          {!loading && error && (
            <div className="py-16 text-center text-sm text-destructive">
              {error}
            </div>
          )}
          {!loading && !error && donations.length === 0 && (
            <div className="py-16 text-center">
              <Heart className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No donations yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Record your first donation to get started.
              </p>
              <Link href={`/${orgSlug}/admin/donations/new`} className="mt-4 inline-block">
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  Record Donation
                </Button>
              </Link>
            </div>
          )}
          {!loading && !error && donations.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Donor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                      Campaign
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {donations.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {d.isAnonymous ? "Anonymous" : d.donorName}
                        </div>
                        {!d.isAnonymous && (
                          <div className="text-xs text-muted-foreground">{d.donorEmail}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {formatCurrency(d.amount, d.currency)}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        {d.campaign?.name ?? (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground capitalize">
                        {d.paymentMethod.replace(/_/g, " ").toLowerCase()}
                      </td>
                      <td className="px-4 py-3">{statusBadge(d.status)}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination */}
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
                      onClick={() => orgId && fetchDonations(orgId, meta.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={meta.page >= Math.ceil(meta.total / meta.limit)}
                      onClick={() => orgId && fetchDonations(orgId, meta.page + 1)}
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

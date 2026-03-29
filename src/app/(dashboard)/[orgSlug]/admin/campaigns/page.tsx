"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Target, Plus, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Campaign {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  status: string;
  goalAmount: number | null;
  raisedAmount: number;
  startDate: string | null;
  endDate: string | null;
  _count: { donations: number };
}

interface CampaignsResponse {
  success: boolean;
  data: Campaign[] | null;
  error: { code: string; message: string } | null;
  meta?: { page: number; limit: number; total: number };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    DRAFT: "bg-gray-100 text-gray-600",
    PAUSED: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-blue-100 text-blue-700",
    ARCHIVED: "bg-gray-100 text-gray-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default function CampaignsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${id}/campaigns?limit=100`);
      if (res.status === 401 || res.status === 403) {
        router.push(`/${orgSlug}/admin`);
        return;
      }
      const json = await res.json() as CampaignsResponse;
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load campaigns");
        return;
      }
      setCampaigns(json.data ?? []);
    } catch {
      setError("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [orgSlug, router]);

  useEffect(() => {
    async function init() {
      const res = await fetch(`/api/public/orgs/${orgSlug}`);
      if (!res.ok) { setLoading(false); return; }
      const json = await res.json() as { success: boolean; data: { id: string } | null };
      const id = json.data?.id;
      if (!id) { setLoading(false); return; }
      setOrgId(id);
      fetchCampaigns(id);
    }
    init();
  }, [orgSlug, fetchCampaigns]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage fundraising campaigns with goal tracking
          </p>
        </div>
        <Link href={`/${orgSlug}/admin/campaigns/new`}>
          <Button>
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Loading campaigns...
        </div>
      )}

      {!loading && error && (
        <div className="py-16 text-center text-sm text-destructive">{error}</div>
      )}

      {!loading && !error && campaigns.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Target className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No campaigns yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first campaign to start fundraising.
            </p>
            <Link href={`/${orgSlug}/admin/campaigns/new`} className="mt-4 inline-block">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" />
                New Campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!loading && !error && campaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((campaign) => {
            const progress =
              campaign.goalAmount && campaign.goalAmount > 0
                ? Math.min(100, (campaign.raisedAmount / campaign.goalAmount) * 100)
                : null;

            return (
              <Card key={campaign.id} className="hover:ring-primary/30 transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm truncate">{campaign.name}</CardTitle>
                      {campaign.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {campaign.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {statusBadge(campaign.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Progress */}
                  {campaign.goalAmount && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-foreground">
                          {formatCurrency(campaign.raisedAmount)}
                        </span>
                        <span className="text-muted-foreground">
                          of {formatCurrency(campaign.goalAmount)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${progress ?? 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(progress ?? 0).toFixed(0)}% funded &middot;{" "}
                        {campaign._count.donations} donation
                        {campaign._count.donations !== 1 ? "s" : ""}
                      </p>
                    </div>
                  )}
                  {!campaign.goalAmount && (
                    <p className="text-xs text-muted-foreground mb-3">
                      {formatCurrency(campaign.raisedAmount)} raised &middot;{" "}
                      {campaign._count.donations} donation
                      {campaign._count.donations !== 1 ? "s" : ""}
                    </p>
                  )}

                  {/* Type badge */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">
                      {campaign.type.charAt(0) + campaign.type.slice(1).toLowerCase()}
                    </span>
                    {campaign.endDate && (
                      <>
                        <span>&middot;</span>
                        <span>
                          Ends {new Date(campaign.endDate).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

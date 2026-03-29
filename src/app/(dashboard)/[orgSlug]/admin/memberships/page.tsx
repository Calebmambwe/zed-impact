"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, Plus, Users, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MembershipTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  interval: "MONTHLY" | "QUARTERLY" | "ANNUAL";
  isPublished: boolean;
  createdAt: string;
  _count: { memberships: number };
}

interface TiersResponse {
  success: boolean;
  data: MembershipTier[] | null;
  error: { code: string; message: string } | null;
  meta?: { page: number; limit: number; total: number };
}

async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

const INTERVAL_LABELS: Record<string, string> = {
  MONTHLY: "/ month",
  QUARTERLY: "/ quarter",
  ANNUAL: "/ year",
};

export default function MembershipsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTiers = useCallback(async (id: string, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${id}/memberships?page=${page}&limit=20`);
      if (res.status === 401 || res.status === 403) {
        router.push(`/${orgSlug}/admin`);
        return;
      }
      const json = await res.json() as TiersResponse;
      if (!json.success || !json.data) {
        setError(json.error?.message ?? "Failed to load membership tiers");
        return;
      }
      setTiers(json.data);
      setMeta(json.meta ?? null);
    } catch {
      setError("Failed to load membership tiers");
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
      fetchTiers(id);
    });
  }, [orgSlug, fetchTiers]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Memberships</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage recurring membership tiers
          </p>
        </div>
        <Link href={`/${orgSlug}/admin/memberships/new`}>
          <Button>
            <Plus className="h-4 w-4" />
            New Tier
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading membership tiers...
        </div>
      )}
      {!loading && error && (
        <div className="py-16 text-center text-sm text-destructive">{error}</div>
      )}
      {!loading && !error && tiers.length === 0 && (
        <div className="py-16 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-sm font-medium text-foreground">No membership tiers yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Create a tier to start offering recurring memberships.
          </p>
          <Link href={`/${orgSlug}/admin/memberships/new`}>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              New Tier
            </Button>
          </Link>
        </div>
      )}
      {!loading && !error && tiers.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiers.map((tier) => (
              <Card key={tier.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold text-foreground">
                      {tier.name}
                    </CardTitle>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${
                        tier.isPublished
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {tier.isPublished ? "Live" : "Draft"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {tier.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {tier.description}
                    </p>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">
                      ${tier.price}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {INTERVAL_LABELS[tier.interval] ?? `/ ${tier.interval.toLowerCase()}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{tier._count.memberships} active member{tier._count.memberships !== 1 ? "s" : ""}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {meta && meta.total > meta.limit && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-muted-foreground">
                Page {meta.page} of {Math.ceil(meta.total / meta.limit)}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={meta.page <= 1}
                  onClick={() => orgId && fetchTiers(orgId, meta.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={meta.page >= Math.ceil(meta.total / meta.limit)}
                  onClick={() => orgId && fetchTiers(orgId, meta.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

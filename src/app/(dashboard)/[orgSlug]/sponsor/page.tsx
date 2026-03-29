"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Baby, DollarSign, Heart, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SponsorStats {
  activeSponsorships: number;
  totalGiven: number;
  currency: string;
  children: Array<{
    id: string;
    firstName: string;
    lastName: string;
    age: number | null;
    location: string | null;
  }>;
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

export default function SponsorDashboardPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";

  const [stats, setStats] = useState<SponsorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const orgId = await resolveOrgId(orgSlug);
      if (!orgId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/orgs/${orgId}/sponsor/dashboard`);
        if (res.ok) {
          const json = await res.json() as { success: boolean; data: SponsorStats | null };
          setStats(json.data ?? null);
        }
      } catch {
        // use null stats — show empty state
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [orgSlug]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Thank you for making a difference in children&apos;s lives.
        </p>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your dashboard…
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Active Sponsorships
                  </p>
                  <Baby className="h-4 w-4 text-muted-foreground/60" />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.activeSponsorships ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stats?.activeSponsorships === 1 ? "child" : "children"} sponsored
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Total Given
                  </p>
                  <DollarSign className="h-4 w-4 text-muted-foreground/60" />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {stats ? formatCurrency(stats.totalGiven, stats.currency) : "$0"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">lifetime contributions</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Impact
                  </p>
                  <Heart className="h-4 w-4 text-muted-foreground/60" />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.activeSponsorships ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">lives changed</p>
              </CardContent>
            </Card>
          </div>

          {/* Children quick view */}
          {stats?.children && stats.children.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Your Sponsored Children</h2>
                <Link href={`/${orgSlug}/sponsor/children`}>
                  <Button variant="ghost" size="sm">View all</Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.children.slice(0, 3).map((child) => (
                  <Link key={child.id} href={`/${orgSlug}/sponsor/children/${child.id}`}>
                    <Card className="hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-pointer">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                            <Baby className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {child.firstName} {child.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {child.age != null ? `Age ${child.age}` : ""}
                              {child.age != null && child.location ? " · " : ""}
                              {child.location ?? ""}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Baby className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No children sponsored yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Browse available children to begin your sponsorship journey.
                </p>
                <Link href={`/sponsor`} className="mt-4 inline-block">
                  <Button size="sm">Browse Children</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

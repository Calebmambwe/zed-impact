"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Baby, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SponsoredChild {
  id: string;
  firstName: string;
  lastName: string;
  age: number | null;
  gender: string | null;
  location: string | null;
  program: { name: string } | null;
  sponsorshipAmount: number | null;
  currency: string;
}

interface ChildrenResponse {
  success: boolean;
  data: SponsoredChild[] | null;
  error: { code: string; message: string } | null;
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

export default function SponsorChildrenPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [children, setChildren] = useState<SponsoredChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const orgId = await resolveOrgId(orgSlug);
      if (!orgId) {
        setError("Organization not found");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/orgs/${orgId}/sponsor/children`);
        if (res.status === 401 || res.status === 403) {
          router.push(`/${orgSlug}/sponsor`);
          return;
        }
        if (res.status === 404) {
          setChildren([]);
          setLoading(false);
          return;
        }
        const json = await res.json() as ChildrenResponse;
        setChildren(json.data ?? []);
      } catch {
        setError("Failed to load your sponsored children");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [orgSlug, router]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Children</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          The children you sponsor and support each month
        </p>
      </div>

      {loading && (
        <div className="py-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your children…
        </div>
      )}

      {!loading && error && (
        <div className="py-16 text-center text-sm text-destructive">{error}</div>
      )}

      {!loading && !error && children.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Baby className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No children sponsored yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Browse available children to begin making a difference.
            </p>
            <Link href="/sponsor" className="mt-4 inline-block">
              <Button size="sm">Browse Children</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!loading && !error && children.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/${orgSlug}/sponsor/children/${child.id}`}
            >
              <Card className="hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-pointer h-full">
                <CardContent className="pt-5">
                  {/* Photo placeholder */}
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                    <Baby className="h-10 w-10 text-primary" />
                  </div>

                  <div className="text-center">
                    <p className="font-semibold text-foreground">
                      {child.firstName} {child.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[
                        child.age != null ? `Age ${child.age}` : null,
                        child.gender ? child.gender.charAt(0) + child.gender.slice(1).toLowerCase() : null,
                      ].filter(Boolean).join(" · ")}
                    </p>
                    {child.location && (
                      <p className="text-xs text-muted-foreground mt-0.5">{child.location}</p>
                    )}
                    {child.program && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {child.program.name}
                      </p>
                    )}
                    {child.sponsorshipAmount != null && (
                      <p className="text-sm font-semibold text-primary mt-2">
                        {formatCurrency(child.sponsorshipAmount, child.currency)}/mo
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

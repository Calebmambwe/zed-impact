"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Baby, MapPin, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ChildDetail {
  id: string;
  firstName: string;
  lastName: string;
  age: number | null;
  gender: string | null;
  location: string | null;
  story: string | null;
  program: { name: string; description: string | null } | null;
  school: { name: string; type: string } | null;
  sponsorshipAmount: number | null;
  currency: string;
  updates: Array<{
    id: string;
    content: string;
    createdAt: string;
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

export default function ChildDetailPage() {
  const params = useParams<{ orgSlug: string; childId: string }>();
  const orgSlug = params.orgSlug ?? "";
  const childId = params.childId ?? "";
  const router = useRouter();

  const [child, setChild] = useState<ChildDetail | null>(null);
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
        const res = await fetch(`/api/orgs/${orgId}/children/${childId}`);
        if (res.status === 401 || res.status === 403) {
          router.push(`/${orgSlug}/sponsor/children`);
          return;
        }
        if (res.status === 404) {
          setError("Child not found");
          setLoading(false);
          return;
        }
        const json = await res.json() as { success: boolean; data: ChildDetail | null };
        setChild(json.data ?? null);
      } catch {
        setError("Failed to load child details");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [orgSlug, childId, router]);

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-destructive mb-4">{error ?? "Child not found"}</p>
        <Link href={`/${orgSlug}/sponsor/children`}>
          <Button variant="outline" size="sm">Back to Children</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/sponsor/children`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {child.firstName} {child.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">Child profile</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Profile card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                <Baby className="h-12 w-12 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">
                  {child.firstName} {child.lastName}
                </h2>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                  {child.age != null && <span>Age {child.age}</span>}
                  {child.gender && (
                    <span>{child.gender.charAt(0) + child.gender.slice(1).toLowerCase()}</span>
                  )}
                  {child.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {child.location}
                    </span>
                  )}
                </div>
                {child.program && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Program: {child.program.name}
                  </p>
                )}
                {child.school && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    School: {child.school.name}
                  </p>
                )}
                {child.sponsorshipAmount != null && (
                  <p className="text-sm font-semibold text-primary mt-2">
                    {formatCurrency(child.sponsorshipAmount, child.currency)}/month
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Story */}
        {child.story && (
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-sm">Story</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{child.story}</p>
            </CardContent>
          </Card>
        )}

        {/* Recent updates */}
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-sm">Recent Updates</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {child.updates && child.updates.length > 0 ? (
              <div className="space-y-4">
                {child.updates.map((update) => (
                  <div key={update.id} className="border-l-2 border-primary/30 pl-4">
                    <p className="text-sm text-foreground leading-relaxed">{update.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(update.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No updates yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

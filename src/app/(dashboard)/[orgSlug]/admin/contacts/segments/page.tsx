"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Filter, Plus, Users, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Segment {
  id: string;
  name: string;
  description: string | null;
  contactCount: number;
  updatedAt: string;
}

interface SegmentsResponse {
  success: boolean;
  data: { segments: Segment[] } | null;
  error: { code: string; message: string } | null;
}

async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

export default function SegmentsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const orgId = await resolveOrgId(orgSlug);
      if (!orgId) {
        setError("Organization not found");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/orgs/${orgId}/contacts/segments`);
        if (res.status === 401 || res.status === 403) {
          router.push(`/${orgSlug}/admin`);
          return;
        }
        const json = await res.json() as SegmentsResponse;
        if (!json.success || !json.data) {
          setError(json.error?.message ?? "Failed to load segments");
          return;
        }
        setSegments(json.data.segments);
      } catch {
        setError("Failed to load segments");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [orgSlug, router]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Segments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Build smart contact groups based on filters
          </p>
        </div>
        <Link href={`/${orgSlug}/admin/contacts/segments/new`}>
          <Button>
            <Plus className="h-4 w-4" />
            New Segment
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            All Segments
            {!loading && (
              <span className="text-muted-foreground font-normal">
                ({segments.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="py-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading segments…
            </div>
          )}
          {!loading && error && (
            <div className="py-16 text-center text-sm text-destructive">{error}</div>
          )}
          {!loading && !error && segments.length === 0 && (
            <div className="py-16 text-center">
              <Filter className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No segments yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create a segment to group contacts by shared attributes.
              </p>
              <Link href={`/${orgSlug}/admin/contacts/segments/new`} className="mt-4 inline-block">
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  New Segment
                </Button>
              </Link>
            </div>
          )}
          {!loading && !error && segments.length > 0 && (
            <ul className="divide-y">
              {segments.map((seg) => (
                <li
                  key={seg.id}
                  className="flex items-center justify-between px-4 py-4 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => router.push(`/${orgSlug}/admin/contacts?segment=${seg.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Filter className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{seg.name}</p>
                      {seg.description && (
                        <p className="text-xs text-muted-foreground">{seg.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {seg.contactCount.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">contacts</p>
                    </div>
                    <div className="hidden sm:block">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <RefreshCw className="h-3 w-3" />
                        {new Date(seg.updatedAt).toLocaleDateString()}
                      </div>
                      <p className="text-xs text-muted-foreground">last refreshed</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

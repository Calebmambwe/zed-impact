"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Plus, Send, Clock, FileText, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  totalSent: number;
  totalOpened: number;
  sentAt: string | null;
  createdAt: string;
  segment: { id: string; name: string } | null;
}

interface CampaignsResponse {
  success: boolean;
  data: { campaigns: EmailCampaign[] } | null;
  error: { code: string; message: string } | null;
  meta?: { page: number; limit: number; total: number };
}

async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    SCHEDULED: "bg-blue-100 text-blue-700",
    SENDING: "bg-yellow-100 text-yellow-700",
    SENT: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default function EmailCampaignsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null);
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
        const res = await fetch(`/api/orgs/${orgId}/email/campaigns`);
        if (res.status === 401 || res.status === 403) {
          router.push(`/${orgSlug}/admin`);
          return;
        }
        const json = await res.json() as CampaignsResponse;
        if (!json.success || !json.data) {
          setError(json.error?.message ?? "Failed to load campaigns");
          return;
        }
        setCampaigns(json.data.campaigns);
        setMeta(json.meta ?? null);
      } catch {
        setError("Failed to load campaigns");
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
          <h1 className="text-2xl font-bold text-foreground">Email Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and send targeted email campaigns to your contacts
          </p>
        </div>
        <Link href={`/${orgSlug}/admin/email/new`}>
          <Button>
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            All Campaigns
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
              Loading campaigns…
            </div>
          )}
          {!loading && error && (
            <div className="py-16 text-center text-sm text-destructive">{error}</div>
          )}
          {!loading && !error && campaigns.length === 0 && (
            <div className="py-16 text-center">
              <Mail className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No campaigns yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Compose your first email campaign to engage your supporters.
              </p>
              <Link href={`/${orgSlug}/admin/email/new`} className="mt-4 inline-block">
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  New Campaign
                </Button>
              </Link>
            </div>
          )}
          {!loading && !error && campaigns.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Campaign
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      Sent
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                      Opened
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground truncate max-w-[200px]">{c.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{c.subject}</div>
                        {c.segment && (
                          <div className="text-xs text-muted-foreground/70 mt-0.5">
                            Segment: {c.segment.name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{statusBadge(c.status)}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1 text-foreground">
                          <Send className="h-3 w-3 text-muted-foreground" />
                          {c.totalSent.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                        {c.totalSent > 0
                          ? `${Math.round((c.totalOpened / c.totalSent) * 100)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {c.sentAt
                            ? new Date(c.sentAt).toLocaleDateString()
                            : new Date(c.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

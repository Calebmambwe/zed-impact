"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Segment {
  id: string;
  name: string;
  contactCount: number;
}

interface SegmentsResponse {
  success: boolean;
  data: { segments: Segment[] } | null;
  error: { code: string; message: string } | null;
}

interface CampaignResponse {
  success: boolean;
  data: { id: string } | null;
  error: { code: string; message: string } | null;
}

async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

export default function NewEmailCampaignPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [body, setBody] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const id = await resolveOrgId(orgSlug);
      if (!id) return;
      setOrgId(id);

      try {
        const res = await fetch(`/api/orgs/${id}/contacts/segments`);
        const json = await res.json() as SegmentsResponse;
        if (json.success && json.data) {
          setSegments(json.data.segments);
        }
      } catch {
        // Segments are optional — silently ignore
      }
    }
    void load();
  }, [orgSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !subject.trim()) {
      setError("Campaign name and subject are required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const id = orgId ?? await resolveOrgId(orgSlug);
      if (!id) {
        setError("Organization not found");
        return;
      }

      const blocks = body.trim()
        ? [{ type: "text", content: body.trim() }]
        : [];

      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        previewText: previewText.trim() || undefined,
        blocks,
        segmentId: segmentId || undefined,
      };

      const res = await fetch(`/api/orgs/${id}/email/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json() as CampaignResponse;
      if (!json.success) {
        setError(json.error?.message ?? "Failed to create campaign");
        return;
      }

      router.push(`/${orgSlug}/admin/email`);
    } catch {
      setError("Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/admin/email`}>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Email
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold text-foreground">New Campaign</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm font-medium">Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="campaign-name">
                Campaign Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="campaign-name"
                placeholder="e.g. Year-End Appeal 2025"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-subject">
                Subject Line <span className="text-destructive">*</span>
              </Label>
              <Input
                id="campaign-subject"
                placeholder="e.g. Your gift made a difference this year"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-preview">Preview Text</Label>
              <Input
                id="campaign-preview"
                placeholder="Short summary shown in email clients…"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Body
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="campaign-body">Message</Label>
              <textarea
                id="campaign-body"
                rows={10}
                placeholder="Write your email message here…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                aria-label="Email body"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm font-medium">Audience</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="campaign-segment">Segment (optional)</Label>
              <select
                id="campaign-segment"
                value={segmentId}
                onChange={(e) => setSegmentId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="Target segment"
              >
                <option value="">All contacts</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.contactCount.toLocaleString()} contacts)
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Leave blank to send to all contacts, or choose a segment to target a subset.
              </p>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Save as Draft
              </>
            )}
          </Button>
          <Link href={`/${orgSlug}/admin/email`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

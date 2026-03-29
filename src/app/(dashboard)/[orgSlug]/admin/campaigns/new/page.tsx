"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface FormState {
  name: string;
  slug: string;
  description: string;
  type: string;
  status: string;
  goalAmount: string;
  startDate: string;
  endDate: string;
}

const CAMPAIGN_TYPES = [
  { value: "DONATION", label: "General Donation" },
  { value: "EVENT", label: "Event" },
  { value: "RAFFLE", label: "Raffle" },
  { value: "AUCTION", label: "Auction" },
  { value: "P2P", label: "Peer-to-Peer" },
  { value: "MEMBERSHIP", label: "Membership" },
  { value: "EMERGENCY", label: "Emergency" },
];

const CAMPAIGN_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
];

/** Converts a campaign name to a URL-safe slug. */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

export default function NewCampaignPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    slug: "",
    description: "",
    type: "DONATION",
    status: "DRAFT",
    goalAmount: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    async function init() {
      const res = await fetch(`/api/public/orgs/${orgSlug}`);
      if (!res.ok) return;
      const json = await res.json() as { success: boolean; data: { id: string } | null };
      if (json.data?.id) setOrgId(json.data.id);
    }
    init();
  }, [orgSlug]);

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      // Auto-generate slug from name unless the user has manually edited it
      ...(field === "name" && prev.slug === nameToSlug(prev.name)
        ? { slug: nameToSlug(value) }
        : {}),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Campaign name is required";
    if (!form.slug.trim()) errs.slug = "Slug is required";
    else if (!/^[a-z0-9-]+$/.test(form.slug))
      errs.slug = "Slug must be lowercase alphanumeric with hyphens";
    if (form.goalAmount) {
      const amt = parseFloat(form.goalAmount);
      if (isNaN(amt) || amt <= 0) errs.goalAmount = "Goal must be a positive number";
    }
    return Object.keys(errs).length === 0 ? true : (setErrors(errs), false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !validate()) return;
    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch(`/api/orgs/${orgId}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || undefined,
          type: form.type,
          status: form.status,
          goalAmount: form.goalAmount ? parseFloat(form.goalAmount) : undefined,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
        }),
      });

      const json = await res.json() as { success: boolean; error?: { code: string; message: string } };
      if (!json.success) {
        if (json.error?.code === "CONFLICT") {
          setErrors({ slug: "This slug is already taken. Choose another." });
        } else {
          setServerError(json.error?.message ?? "Failed to create campaign");
        }
        return;
      }

      router.push(`/${orgSlug}/admin/campaigns`);
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/admin/campaigns`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Campaign</h1>
          <p className="text-sm text-muted-foreground">
            Create a fundraising campaign with goal tracking
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm">Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {serverError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Annual Giving Drive 2026"
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center gap-0">
                <span className="inline-flex h-9 items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                  /donate/
                </span>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => update("slug", e.target.value.toLowerCase())}
                  placeholder="annual-giving-2026"
                  aria-invalid={!!errors.slug}
                  className="rounded-l-none"
                />
              </div>
              {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
            </div>

            {/* Type + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="type">Campaign Type</Label>
                <select
                  id="type"
                  value={form.type}
                  onChange={(e) => update("type", e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                >
                  {CAMPAIGN_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Initial Status</Label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => update("status", e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                >
                  {CAMPAIGN_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Tell donors what this campaign is about..."
                rows={3}
              />
            </div>

            {/* Goal */}
            <div className="space-y-1.5">
              <Label htmlFor="goalAmount">Fundraising Goal (optional)</Label>
              <Input
                id="goalAmount"
                type="number"
                min="1"
                step="1"
                value={form.goalAmount}
                onChange={(e) => update("goalAmount", e.target.value)}
                placeholder="10000"
                aria-invalid={!!errors.goalAmount}
              />
              {errors.goalAmount && (
                <p className="text-xs text-destructive">{errors.goalAmount}</p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start Date (optional)</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End Date (optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={submitting || !orgId}>
                {submitting ? "Creating..." : "Create Campaign"}
              </Button>
              <Link href={`/${orgSlug}/admin/campaigns`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

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
  title: string;
  slug: string;
  description: string;
  type: string;
  location: string;
  virtualUrl: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isPublished: boolean;
  maxCapacity: string;
}

const EVENT_TYPES = [
  { value: "IN_PERSON", label: "In Person" },
  { value: "VIRTUAL", label: "Virtual" },
  { value: "HYBRID", label: "Hybrid" },
];

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

export default function NewEventPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    title: "",
    slug: "",
    description: "",
    type: "IN_PERSON",
    location: "",
    virtualUrl: "",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "17:00",
    isPublished: false,
    maxCapacity: "",
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

  function update(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "title" && typeof value === "string" && prev.slug === nameToSlug(prev.title)
        ? { slug: nameToSlug(value) }
        : {}),
    }));
    if (typeof value === "string") {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Event title is required";
    if (!form.slug.trim()) errs.slug = "Slug is required";
    else if (!/^[a-z0-9-]+$/.test(form.slug))
      errs.slug = "Slug must be lowercase alphanumeric with hyphens";
    if (!form.startDate) errs.startDate = "Start date is required";
    if (!form.startTime) errs.startTime = "Start time is required";
    if (form.type === "VIRTUAL" && form.virtualUrl) {
      try { new URL(form.virtualUrl); } catch { errs.virtualUrl = "Enter a valid URL"; }
    }
    if (form.maxCapacity) {
      const cap = parseInt(form.maxCapacity);
      if (isNaN(cap) || cap <= 0) errs.maxCapacity = "Capacity must be a positive integer";
    }
    return Object.keys(errs).length === 0 ? true : (setErrors(errs), false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !validate()) return;
    setSubmitting(true);
    setServerError(null);

    try {
      // Combine date + time into ISO datetime
      const startDate = `${form.startDate}T${form.startTime}:00.000Z`;
      const endDate = form.endDate
        ? `${form.endDate}T${form.endTime}:00.000Z`
        : undefined;

      const res = await fetch(`/api/orgs/${orgId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || undefined,
          type: form.type,
          location: form.location.trim() || undefined,
          virtualUrl: form.virtualUrl.trim() || undefined,
          startDate,
          endDate,
          isPublished: form.isPublished,
          maxCapacity: form.maxCapacity ? parseInt(form.maxCapacity) : undefined,
        }),
      });

      const json = await res.json() as { success: boolean; error?: { code: string; message: string } };
      if (!json.success) {
        if (json.error?.code === "CONFLICT") {
          setErrors({ slug: "This slug is already taken. Choose another." });
        } else {
          setServerError(json.error?.message ?? "Failed to create event");
        }
        return;
      }

      router.push(`/${orgSlug}/admin/events`);
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/admin/events`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Event</h1>
          <p className="text-sm text-muted-foreground">
            Create an event and start accepting registrations
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm">Event Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {serverError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Annual Gala 2026"
                aria-invalid={!!errors.title}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center">
                <span className="inline-flex h-9 items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                  /events/
                </span>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => update("slug", e.target.value.toLowerCase())}
                  placeholder="annual-gala-2026"
                  aria-invalid={!!errors.slug}
                  className="rounded-l-none"
                />
              </div>
              {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label htmlFor="type">Event Type</Label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Location — shown for IN_PERSON and HYBRID */}
            {(form.type === "IN_PERSON" || form.type === "HYBRID") && (
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="123 Main St, New York, NY"
                />
              </div>
            )}

            {/* Virtual URL — shown for VIRTUAL and HYBRID */}
            {(form.type === "VIRTUAL" || form.type === "HYBRID") && (
              <div className="space-y-1.5">
                <Label htmlFor="virtualUrl">Virtual Meeting URL</Label>
                <Input
                  id="virtualUrl"
                  type="url"
                  value={form.virtualUrl}
                  onChange={(e) => update("virtualUrl", e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  aria-invalid={!!errors.virtualUrl}
                />
                {errors.virtualUrl && (
                  <p className="text-xs text-destructive">{errors.virtualUrl}</p>
                )}
              </div>
            )}

            {/* Start date + time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                  aria-invalid={!!errors.startDate}
                />
                {errors.startDate && (
                  <p className="text-xs text-destructive">{errors.startDate}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => update("startTime", e.target.value)}
                />
              </div>
            </div>

            {/* End date + time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End Date (optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => update("endTime", e.target.value)}
                  disabled={!form.endDate}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Tell attendees what this event is about..."
                rows={3}
              />
            </div>

            {/* Capacity */}
            <div className="space-y-1.5">
              <Label htmlFor="maxCapacity">Max Capacity (optional)</Label>
              <Input
                id="maxCapacity"
                type="number"
                min="1"
                step="1"
                value={form.maxCapacity}
                onChange={(e) => update("maxCapacity", e.target.value)}
                placeholder="500"
                aria-invalid={!!errors.maxCapacity}
              />
              {errors.maxCapacity && (
                <p className="text-xs text-destructive">{errors.maxCapacity}</p>
              )}
            </div>

            {/* Publish toggle */}
            <div className="flex items-center gap-2">
              <input
                id="isPublished"
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => update("isPublished", e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor="isPublished" className="cursor-pointer text-sm">
                Publish event immediately
              </Label>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={submitting || !orgId}>
                {submitting ? "Creating..." : "Create Event"}
              </Button>
              <Link href={`/${orgSlug}/admin/events`}>
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

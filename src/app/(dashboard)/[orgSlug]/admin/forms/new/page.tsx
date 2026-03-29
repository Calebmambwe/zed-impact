"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormField {
  id: string;
  type: "text" | "email" | "amount" | "select" | "checkbox" | "divider";
  label: string;
  required: boolean;
  options?: string[];
}

interface Campaign {
  id: string;
  name: string;
}

interface FormState {
  name: string;
  slug: string;
  campaignId: string;
  isPublished: boolean;
}

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "amount", label: "Amount" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "divider", label: "Divider" },
] as const;

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

function generateFieldId(): string {
  return `field_${Math.random().toString(36).slice(2, 9)}`;
}

export default function NewFormPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    slug: "",
    campaignId: "",
    isPublished: false,
  });

  const [fields, setFields] = useState<FormField[]>([
    { id: generateFieldId(), type: "amount", label: "Donation Amount", required: true },
    { id: generateFieldId(), type: "text", label: "Full Name", required: true },
    { id: generateFieldId(), type: "email", label: "Email Address", required: true },
  ]);

  useEffect(() => {
    async function init() {
      const res = await fetch(`/api/public/orgs/${orgSlug}`);
      if (!res.ok) return;
      const json = await res.json() as { success: boolean; data: { id: string } | null };
      const id = json.data?.id;
      if (!id) return;
      setOrgId(id);

      const campRes = await fetch(`/api/orgs/${id}/campaigns?limit=100`);
      if (campRes.ok) {
        const campJson = await campRes.json() as { success: boolean; data: Campaign[] | null };
        setCampaigns(campJson.data ?? []);
      }
    }
    init();
  }, [orgSlug]);

  function updateForm(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "name" && typeof value === "string" && prev.slug === nameToSlug(prev.name)
        ? { slug: nameToSlug(value) }
        : {}),
    }));
  }

  function addField() {
    setFields((prev) => [
      ...prev,
      { id: generateFieldId(), type: "text", label: "New Field", required: false },
    ]);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Form name is required";
    if (!form.slug.trim()) errs.slug = "Slug is required";
    else if (!/^[a-z0-9-]+$/.test(form.slug))
      errs.slug = "Slug must be lowercase alphanumeric with hyphens";
    if (fields.length === 0) errs.fields = "Add at least one field";
    return Object.keys(errs).length === 0 ? true : (setErrors(errs), false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !validate()) return;
    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch(`/api/orgs/${orgId}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          fields,
          isPublished: form.isPublished,
          campaignId: form.campaignId || null,
        }),
      });

      const json = await res.json() as { success: boolean; error?: { code: string; message: string } };
      if (!json.success) {
        if (json.error?.code === "CONFLICT") {
          setErrors({ slug: "This slug is already taken. Choose another." });
        } else {
          setServerError(json.error?.message ?? "Failed to create form");
        }
        return;
      }

      router.push(`/${orgSlug}/admin/forms`);
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/admin/forms`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Donation Form</h1>
          <p className="text-sm text-muted-foreground">
            Build a custom form to share with your donors
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {serverError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm">Form Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Form Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
                placeholder="General Donation Form"
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center">
                <span className="inline-flex h-9 items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                  /donate/
                </span>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => updateForm("slug", e.target.value.toLowerCase())}
                  placeholder="general-donation"
                  aria-invalid={!!errors.slug}
                  className="rounded-l-none"
                />
              </div>
              {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
            </div>

            {campaigns.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="campaignId">Link to Campaign (optional)</Label>
                <select
                  id="campaignId"
                  value={form.campaignId}
                  onChange={(e) => updateForm("campaignId", e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">No campaign</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                id="isPublished"
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => updateForm("isPublished", e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor="isPublished" className="cursor-pointer">
                Publish immediately
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Fields */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Form Fields</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addField}>
                <Plus className="h-3.5 w-3.5" />
                Add Field
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {errors.fields && (
              <p className="text-xs text-destructive mb-3">{errors.fields}</p>
            )}
            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="flex items-start gap-2 p-3 rounded-lg border border-input bg-muted/20"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-2.5 shrink-0 cursor-grab" />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      placeholder="Field label"
                      className="h-8 text-sm"
                    />
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(field.id, {
                          type: e.target.value as FormField["type"],
                        })
                      }
                      className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1.5">
                      <input
                        id={`required-${field.id}`}
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          updateField(field.id, { required: e.target.checked })
                        }
                        className="h-3.5 w-3.5 rounded border-input accent-primary"
                      />
                      <label
                        htmlFor={`required-${field.id}`}
                        className="text-xs text-muted-foreground cursor-pointer"
                      >
                        Required
                      </label>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeField(field.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={fields.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting || !orgId}>
            {submitting ? "Creating..." : "Create Form"}
          </Button>
          <Link href={`/${orgSlug}/admin/forms`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

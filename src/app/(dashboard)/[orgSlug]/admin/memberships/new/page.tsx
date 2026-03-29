"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface FormState {
  name: string;
  description: string;
  price: string;
  interval: string;
  isPublished: boolean;
}

const INTERVALS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUAL", label: "Annual" },
];

export default function NewMembershipTierPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [benefits, setBenefits] = useState<string[]>([""]);

  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    price: "",
    interval: "MONTHLY",
    isPublished: false,
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
    setForm((prev) => ({ ...prev, [field]: value }));
    if (typeof value === "string") {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function updateBenefit(index: number, value: string) {
    setBenefits((prev) => prev.map((b, i) => (i === index ? value : b)));
  }

  function addBenefit() {
    setBenefits((prev) => [...prev, ""]);
  }

  function removeBenefit(index: number) {
    setBenefits((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Tier name is required";
    if (!form.price) errs.price = "Price is required";
    else {
      const p = parseFloat(form.price);
      if (isNaN(p) || p < 0) errs.price = "Price must be a non-negative number";
    }
    return Object.keys(errs).length === 0 ? true : (setErrors(errs), false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !validate()) return;
    setSubmitting(true);
    setServerError(null);

    try {
      const filteredBenefits = benefits.filter((b) => b.trim());

      const res = await fetch(`/api/orgs/${orgId}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          price: parseFloat(form.price),
          interval: form.interval,
          benefits: filteredBenefits.length > 0 ? filteredBenefits : undefined,
          isPublished: form.isPublished,
        }),
      });

      const json = await res.json() as { success: boolean; error?: { code: string; message: string } };
      if (!json.success) {
        setServerError(json.error?.message ?? "Failed to create membership tier");
        return;
      }

      router.push(`/${orgSlug}/admin/memberships`);
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/admin/memberships`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Membership Tier</h1>
          <p className="text-sm text-muted-foreground">
            Create a recurring membership level for supporters
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm">Tier Details</CardTitle>
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
              <Label htmlFor="name">Tier Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Gold Member"
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* Price + Interval */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="price">Price (USD)</Label>
                <div className="flex items-center">
                  <span className="inline-flex h-9 items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => update("price", e.target.value)}
                    placeholder="25.00"
                    aria-invalid={!!errors.price}
                    className="rounded-l-none"
                  />
                </div>
                {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="interval">Billing Interval</Label>
                <select
                  id="interval"
                  value={form.interval}
                  onChange={(e) => update("interval", e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                >
                  {INTERVALS.map((i) => (
                    <option key={i.value} value={i.value}>
                      {i.label}
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
                placeholder="What members get with this tier..."
                rows={2}
              />
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Benefits (optional)</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addBenefit} className="h-7 text-xs">
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={b}
                      onChange={(e) => updateBenefit(i, e.target.value)}
                      placeholder={`Benefit ${i + 1}, e.g., Monthly newsletter`}
                      className="flex-1"
                    />
                    {benefits.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBenefit(i)}
                        className="text-destructive hover:text-destructive h-9 px-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
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
                Publish tier immediately
              </Label>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={submitting || !orgId}>
                {submitting ? "Creating..." : "Create Tier"}
              </Button>
              <Link href={`/${orgSlug}/admin/memberships`}>
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

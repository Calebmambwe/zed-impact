"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface FormState {
  name: string;
  description: string;
  sponsorshipAmount: string;
}

export default function NewProgramPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    sponsorshipAmount: "",
  });

  useEffect(() => {
    async function init() {
      const res = await fetch(`/api/public/orgs/${orgSlug}`);
      if (!res.ok) return;
      const json = await res.json() as { success: boolean; data: { id: string } | null };
      const id = json.data?.id;
      if (id) setOrgId(id);
    }
    init();
  }, [orgSlug]);

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Program name is required";
    if (form.sponsorshipAmount && (isNaN(Number(form.sponsorshipAmount)) || Number(form.sponsorshipAmount) < 0))
      errs.sponsorshipAmount = "Must be a positive number";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !validate()) return;
    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch(`/api/orgs/${orgId}/programs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description || undefined,
          sponsorshipAmount: form.sponsorshipAmount ? Number(form.sponsorshipAmount) : undefined,
        }),
      });

      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (!json.success) {
        setServerError(json.error?.message ?? "Failed to create program");
        return;
      }

      router.push(`/${orgSlug}/admin/programs`);
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/admin/programs`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Program</h1>
          <p className="text-sm text-muted-foreground">
            Define a new sponsorship program for children
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm">Program Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {serverError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">
                Program Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Education Sponsorship"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p id="name-error" className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Describe what this program covers and how sponsorships are used…"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sponsorshipAmount">Default Monthly Amount (USD)</Label>
              <Input
                id="sponsorshipAmount"
                type="number"
                min="0"
                step="0.01"
                value={form.sponsorshipAmount}
                onChange={(e) => update("sponsorshipAmount", e.target.value)}
                placeholder="35.00"
                aria-invalid={!!errors.sponsorshipAmount}
                aria-describedby={errors.sponsorshipAmount ? "amount-error" : undefined}
              />
              {errors.sponsorshipAmount && (
                <p id="amount-error" className="text-xs text-destructive">{errors.sponsorshipAmount}</p>
              )}
              <p className="text-xs text-muted-foreground">
                This is the default amount — individual children can have different amounts.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={submitting || !orgId}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create Program"
                )}
              </Button>
              <Link href={`/${orgSlug}/admin/programs`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

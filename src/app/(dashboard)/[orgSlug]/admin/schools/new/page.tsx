"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormState {
  name: string;
  location: string;
  type: string;
}

const SCHOOL_TYPES = [
  { value: "PRIMARY", label: "Primary" },
  { value: "SECONDARY", label: "Secondary" },
  { value: "TERTIARY", label: "Tertiary / University" },
  { value: "VOCATIONAL", label: "Vocational / Technical" },
  { value: "OTHER", label: "Other" },
];

export default function NewSchoolPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    location: "",
    type: "PRIMARY",
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
    if (!form.name.trim()) errs.name = "School name is required";
    if (!form.type) errs.type = "School type is required";
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
      const res = await fetch(`/api/orgs/${orgId}/schools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          location: form.location || undefined,
          type: form.type,
        }),
      });

      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (!json.success) {
        setServerError(json.error?.message ?? "Failed to add school");
        return;
      }

      router.push(`/${orgSlug}/admin/schools`);
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/admin/schools`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add School</h1>
          <p className="text-sm text-muted-foreground">
            Register a new partner school for sponsored children
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm">School Details</CardTitle>
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
                School Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Chawama Primary School"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p id="name-error" className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="Lusaka, Zambia"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type">
                School Type <span className="text-destructive">*</span>
              </Label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                aria-invalid={!!errors.type}
              >
                {SCHOOL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {errors.type && (
                <p className="text-xs text-destructive">{errors.type}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={submitting || !orgId}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Add School"
                )}
              </Button>
              <Link href={`/${orgSlug}/admin/schools`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

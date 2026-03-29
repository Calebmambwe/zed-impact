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

interface Program {
  id: string;
  name: string;
}

interface FormState {
  firstName: string;
  lastName: string;
  age: string;
  gender: string;
  location: string;
  story: string;
  sponsorshipAmount: string;
  programId: string;
}

const GENDERS = [
  { value: "", label: "Select gender" },
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

export default function NewChildPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    age: "",
    gender: "",
    location: "",
    story: "",
    sponsorshipAmount: "",
    programId: "",
  });

  useEffect(() => {
    async function init() {
      const orgRes = await fetch(`/api/public/orgs/${orgSlug}`);
      if (!orgRes.ok) return;
      const orgJson = await orgRes.json() as { success: boolean; data: { id: string } | null };
      const id = orgJson.data?.id;
      if (!id) return;
      setOrgId(id);

      const progRes = await fetch(`/api/orgs/${id}/programs?limit=100`);
      if (progRes.ok) {
        const progJson = await progRes.json() as { success: boolean; data: Program[] | null };
        setPrograms(progJson.data ?? []);
      }
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
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (form.age && (isNaN(Number(form.age)) || Number(form.age) < 0 || Number(form.age) > 25))
      errs.age = "Age must be between 0 and 25";
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
      const res = await fetch(`/api/orgs/${orgId}/children`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          age: form.age ? Number(form.age) : undefined,
          gender: form.gender || undefined,
          location: form.location || undefined,
          story: form.story || undefined,
          sponsorshipAmount: form.sponsorshipAmount ? Number(form.sponsorshipAmount) : undefined,
          programId: form.programId || undefined,
        }),
      });

      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (!json.success) {
        setServerError(json.error?.message ?? "Failed to add child");
        return;
      }

      router.push(`/${orgSlug}/admin/children`);
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/admin/children`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Child</h1>
          <p className="text-sm text-muted-foreground">
            Enroll a new child in a sponsorship program
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm">Child Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {serverError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            {/* Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  placeholder="Grace"
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? "firstName-error" : undefined}
                />
                {errors.firstName && (
                  <p id="firstName-error" className="text-xs text-destructive">{errors.firstName}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  placeholder="Mutale"
                  aria-invalid={!!errors.lastName}
                  aria-describedby={errors.lastName ? "lastName-error" : undefined}
                />
                {errors.lastName && (
                  <p id="lastName-error" className="text-xs text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Age + Gender */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min="0"
                  max="25"
                  value={form.age}
                  onChange={(e) => update("age", e.target.value)}
                  placeholder="8"
                  aria-invalid={!!errors.age}
                  aria-describedby={errors.age ? "age-error" : undefined}
                />
                {errors.age && (
                  <p id="age-error" className="text-xs text-destructive">{errors.age}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  value={form.gender}
                  onChange={(e) => update("gender", e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                >
                  {GENDERS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="Lusaka, Zambia"
              />
            </div>

            {/* Program */}
            {programs.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="programId">Program (optional)</Label>
                <select
                  id="programId"
                  value={form.programId}
                  onChange={(e) => update("programId", e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">No program</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sponsorship Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="sponsorshipAmount">Monthly Sponsorship Amount (USD)</Label>
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
            </div>

            {/* Story */}
            <div className="space-y-1.5">
              <Label htmlFor="story">Story</Label>
              <Textarea
                id="story"
                value={form.story}
                onChange={(e) => update("story", e.target.value)}
                placeholder="Share this child's background and how sponsorship will make a difference…"
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={submitting || !orgId}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Add Child"
                )}
              </Button>
              <Link href={`/${orgSlug}/admin/children`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OrgData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface FormField {
  id: string;
  type: "text" | "email" | "amount" | "select" | "checkbox" | "divider";
  label: string;
  required: boolean;
  options?: string[];
}

interface DonationForm {
  id: string;
  name: string;
  slug: string;
  fields: FormField[];
  campaign?: { id: string; name: string; slug: string } | null;
}

type PageState = "loading" | "form" | "submitting" | "error" | "not_found";

export default function FormDonatePage() {
  const params = useParams<{ orgSlug: string; formSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const formSlug = params.formSlug ?? "";

  const [org, setOrg] = useState<OrgData | null>(null);
  const [donationForm, setDonationForm] = useState<DonationForm | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");

  // Dynamic field values: fieldId -> value
  const [fieldValues, setFieldValues] = useState<Record<string, string | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const [orgRes, formRes] = await Promise.all([
          fetch(`/api/public/orgs/${orgSlug}`),
          fetch(`/api/public/orgs/${orgSlug}/forms/${formSlug}`),
        ]);

        if (!orgRes.ok || !formRes.ok) {
          setPageState("not_found");
          return;
        }

        const orgJson = await orgRes.json() as { success: boolean; data: OrgData | null };
        const formJson = await formRes.json() as { success: boolean; data: DonationForm | null };

        if (!orgJson.data || !formJson.data) {
          setPageState("not_found");
          return;
        }

        setOrg(orgJson.data);
        setDonationForm(formJson.data);

        // Initialize default values
        const defaults: Record<string, string | boolean> = {};
        for (const field of formJson.data.fields) {
          if (field.type === "checkbox") defaults[field.id] = false;
          else if (field.type === "amount") defaults[field.id] = "100";
          else defaults[field.id] = "";
        }
        setFieldValues(defaults);
        setPageState("form");
      } catch {
        setPageState("error");
      }
    }
    load();
  }, [orgSlug, formSlug]);

  function updateField(id: string, value: string | boolean) {
    setFieldValues((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function validate(): boolean {
    if (!donationForm) return false;
    const errs: Record<string, string> = {};
    for (const field of donationForm.fields) {
      if (field.type === "divider") continue;
      const val = fieldValues[field.id];
      if (field.required) {
        if (field.type === "checkbox" && !val) {
          errs[field.id] = `${field.label} is required`;
        } else if (field.type !== "checkbox" && !String(val ?? "").trim()) {
          errs[field.id] = `${field.label} is required`;
        }
      }
      if (field.type === "email" && val) {
        const emailStr = String(val);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
          errs[field.id] = "Enter a valid email address";
        }
      }
      if (field.type === "amount" && val) {
        const amt = parseFloat(String(val));
        if (isNaN(amt) || amt <= 0) errs[field.id] = "Enter a positive amount";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!donationForm || !org || !validate()) return;
    setPageState("submitting");

    // Extract known fields by type
    const amountField = donationForm.fields.find((f) => f.type === "amount");
    const emailField = donationForm.fields.find((f) => f.type === "email");
    const nameField = donationForm.fields.find(
      (f) => f.type === "text" && f.label.toLowerCase().includes("name")
    );

    const amount = amountField ? parseFloat(String(fieldValues[amountField.id] ?? "0")) : 0;
    const donorEmail = emailField ? String(fieldValues[emailField.id] ?? "") : "";
    const donorName = nameField ? String(fieldValues[nameField.id] ?? "Donor") : "Donor";

    try {
      const res = await fetch(`/api/public/orgs/${orgSlug}/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          donorEmail,
          donorName,
          formId: donationForm.id,
          campaignId: donationForm.campaign?.id ?? undefined,
        }),
      });

      const json = await res.json() as {
        success: boolean;
        data?: { checkoutUrl: string };
        error?: { message: string };
      };

      if (!json.success || !json.data?.checkoutUrl) {
        setPageState("error");
        return;
      }

      window.location.href = json.data.checkoutUrl;
    } catch {
      setPageState("error");
    }
  }

  if (pageState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (pageState === "not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">Form not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            This donation form is no longer available.
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium text-foreground">Something went wrong</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              We could not process your donation. Please try again.
            </p>
            <Button size="sm" onClick={() => setPageState("form")}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{org?.name}</h1>
          {donationForm?.campaign && (
            <p className="text-sm text-primary font-medium mt-1">
              {donationForm.campaign.name}
            </p>
          )}
        </div>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base">{donationForm?.name}</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {donationForm?.fields.map((field) => {
                if (field.type === "divider") {
                  return (
                    <hr key={field.id} className="border-border" />
                  );
                }

                if (field.type === "checkbox") {
                  return (
                    <div key={field.id} className="flex items-center gap-2">
                      <input
                        id={field.id}
                        type="checkbox"
                        checked={Boolean(fieldValues[field.id])}
                        onChange={(e) => updateField(field.id, e.target.checked)}
                        className="h-4 w-4 rounded border-input accent-primary"
                        aria-required={field.required}
                      />
                      <Label htmlFor={field.id} className="cursor-pointer">
                        {field.label}
                        {field.required && (
                          <span className="text-destructive ml-0.5">*</span>
                        )}
                      </Label>
                      {errors[field.id] && (
                        <p className="text-xs text-destructive">{errors[field.id]}</p>
                      )}
                    </div>
                  );
                }

                if (field.type === "select" && field.options?.length) {
                  return (
                    <div key={field.id} className="space-y-1.5">
                      <Label htmlFor={field.id}>
                        {field.label}
                        {field.required && (
                          <span className="text-destructive ml-0.5">*</span>
                        )}
                      </Label>
                      <select
                        id={field.id}
                        value={String(fieldValues[field.id] ?? "")}
                        onChange={(e) => updateField(field.id, e.target.value)}
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                        aria-required={field.required}
                        aria-invalid={!!errors[field.id]}
                      >
                        <option value="">Select an option</option>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      {errors[field.id] && (
                        <p className="text-xs text-destructive">{errors[field.id]}</p>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={field.id} className="space-y-1.5">
                    <Label htmlFor={field.id}>
                      {field.label}
                      {field.required && (
                        <span className="text-destructive ml-0.5">*</span>
                      )}
                    </Label>
                    <Input
                      id={field.id}
                      type={field.type === "email" ? "email" : field.type === "amount" ? "number" : "text"}
                      min={field.type === "amount" ? "1" : undefined}
                      step={field.type === "amount" ? "1" : undefined}
                      value={String(fieldValues[field.id] ?? "")}
                      onChange={(e) => updateField(field.id, e.target.value)}
                      aria-required={field.required}
                      aria-invalid={!!errors[field.id]}
                    />
                    {errors[field.id] && (
                      <p className="text-xs text-destructive">{errors[field.id]}</p>
                    )}
                  </div>
                );
              })}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={pageState === "submitting"}
              >
                <Heart className="h-4 w-4" />
                {pageState === "submitting" ? "Processing..." : "Donate"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Secure checkout powered by Stripe.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

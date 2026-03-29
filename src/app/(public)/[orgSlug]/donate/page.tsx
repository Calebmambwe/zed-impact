"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Heart, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OrgData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
}

type PageState = "form" | "submitting" | "success" | "error";

const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

export default function DefaultDonatePage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";

  const [org, setOrg] = useState<OrgData | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const [selectedAmount, setSelectedAmount] = useState<number | null>(100);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageState, setPageState] = useState<PageState>("form");

  useEffect(() => {
    async function loadOrg() {
      try {
        const res = await fetch(`/api/public/orgs/${orgSlug}`);
        if (!res.ok) return;
        const json = await res.json() as { success: boolean; data: OrgData | null };
        setOrg(json.data);
      } finally {
        setOrgLoading(false);
      }
    }
    loadOrg();
  }, [orgSlug]);

  const effectiveAmount = customAmount
    ? parseFloat(customAmount)
    : selectedAmount ?? 0;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!effectiveAmount || effectiveAmount <= 0) errs.amount = "Enter a donation amount";
    if (!donorName.trim()) errs.donorName = "Your name is required";
    if (!donorEmail.trim()) errs.donorEmail = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail))
      errs.donorEmail = "Enter a valid email address";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !org) return;
    setPageState("submitting");

    try {
      const res = await fetch(`/api/public/orgs/${orgSlug}/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: effectiveAmount,
          donorName: donorName.trim(),
          donorEmail: donorEmail.trim(),
          message: message.trim() || undefined,
          isAnonymous,
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

      // Redirect to Stripe Checkout
      window.location.href = json.data.checkoutUrl;
    } catch {
      setPageState("error");
    }
  }

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">Organization not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            The donation page you&apos;re looking for does not exist.
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
          <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
          {org.description && (
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {org.description}
            </p>
          )}
        </div>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base">Make a Donation</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Amount Selection */}
              <div className="space-y-2">
                <Label>Donation Amount</Label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amt);
                        setCustomAmount("");
                        setErrors((p) => { const n = { ...p }; delete n.amount; return n; });
                      }}
                      className={`h-9 rounded-lg border text-sm font-medium transition-colors ${
                        selectedAmount === amt && !customAmount
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background hover:bg-muted"
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(null);
                    setErrors((p) => { const n = { ...p }; delete n.amount; return n; });
                  }}
                  placeholder="Custom amount"
                  aria-invalid={!!errors.amount}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount}</p>
                )}
              </div>

              {/* Donor Info */}
              <div className="space-y-1.5">
                <Label htmlFor="donorName">Full Name</Label>
                <Input
                  id="donorName"
                  value={donorName}
                  onChange={(e) => {
                    setDonorName(e.target.value);
                    setErrors((p) => { const n = { ...p }; delete n.donorName; return n; });
                  }}
                  placeholder="Jane Smith"
                  aria-invalid={!!errors.donorName}
                  disabled={isAnonymous}
                />
                {errors.donorName && (
                  <p className="text-xs text-destructive">{errors.donorName}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="donorEmail">Email Address</Label>
                <Input
                  id="donorEmail"
                  type="email"
                  value={donorEmail}
                  onChange={(e) => {
                    setDonorEmail(e.target.value);
                    setErrors((p) => { const n = { ...p }; delete n.donorEmail; return n; });
                  }}
                  placeholder="jane@example.com"
                  aria-invalid={!!errors.donorEmail}
                />
                {errors.donorEmail && (
                  <p className="text-xs text-destructive">{errors.donorEmail}</p>
                )}
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <Label htmlFor="message">Message (optional)</Label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Leave a message for the organization..."
                  rows={2}
                  maxLength={500}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring resize-none"
                />
              </div>

              {/* Anonymous */}
              <div className="flex items-center gap-2">
                <input
                  id="isAnonymous"
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <Label htmlFor="isAnonymous" className="cursor-pointer text-sm">
                  Make this donation anonymous
                </Label>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={pageState === "submitting"}
              >
                <Heart className="h-4 w-4" />
                {pageState === "submitting"
                  ? "Processing..."
                  : effectiveAmount > 0
                  ? `Donate $${effectiveAmount.toLocaleString()}`
                  : "Donate"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Secure checkout powered by Stripe. Your payment is encrypted and safe.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

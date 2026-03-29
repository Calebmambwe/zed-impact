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

interface Campaign {
  id: string;
  name: string;
}

interface OrgData {
  id: string;
}

interface FormState {
  donorName: string;
  donorEmail: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  campaignId: string;
  notes: string;
  donationDate: string;
  isAnonymous: boolean;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CHECK", label: "Check" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CARD", label: "Card" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "OTHER", label: "Other" },
];

export default function NewDonationPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    donorName: "",
    donorEmail: "",
    amount: "",
    currency: "USD",
    paymentMethod: "CASH",
    campaignId: "",
    notes: "",
    donationDate: new Date().toISOString().split("T")[0],
    isAnonymous: false,
  });

  useEffect(() => {
    async function init() {
      const orgRes = await fetch(`/api/public/orgs/${orgSlug}`);
      if (!orgRes.ok) return;
      const orgJson = await orgRes.json() as { success: boolean; data: OrgData | null };
      const id = orgJson.data?.id;
      if (!id) return;
      setOrgId(id);

      // Load campaigns for the dropdown
      const campRes = await fetch(`/api/orgs/${id}/campaigns?limit=100`);
      if (campRes.ok) {
        const campJson = await campRes.json() as { success: boolean; data: Campaign[] | null };
        setCampaigns(campJson.data ?? []);
      }
    }
    init();
  }, [orgSlug]);

  function update(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.donorName.trim()) errs.donorName = "Donor name is required";
    if (!form.donorEmail.trim()) errs.donorEmail = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.donorEmail))
      errs.donorEmail = "Invalid email address";
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) errs.amount = "Enter a positive amount";
    return Object.keys(errs).length === 0 ? true : (setErrors(errs), false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !validate()) return;
    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch(`/api/orgs/${orgId}/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donorName: form.donorName.trim(),
          donorEmail: form.donorEmail.trim(),
          amount: parseFloat(form.amount),
          currency: form.currency,
          paymentMethod: form.paymentMethod,
          campaignId: form.campaignId || undefined,
          notes: form.notes || undefined,
          donationDate: form.donationDate || undefined,
          isAnonymous: form.isAnonymous,
        }),
      });

      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (!json.success) {
        setServerError(json.error?.message ?? "Failed to record donation");
        return;
      }

      router.push(`/${orgSlug}/admin/donations`);
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/admin/donations`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Record Donation</h1>
          <p className="text-sm text-muted-foreground">
            Manually record an offline donation (cash, check, etc.)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm">Donation Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {serverError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            {/* Donor Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="donorName">Donor Name</Label>
                <Input
                  id="donorName"
                  value={form.donorName}
                  onChange={(e) => update("donorName", e.target.value)}
                  placeholder="Jane Smith"
                  aria-invalid={!!errors.donorName}
                />
                {errors.donorName && (
                  <p className="text-xs text-destructive">{errors.donorName}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="donorEmail">Donor Email</Label>
                <Input
                  id="donorEmail"
                  type="email"
                  value={form.donorEmail}
                  onChange={(e) => update("donorEmail", e.target.value)}
                  placeholder="jane@example.com"
                  aria-invalid={!!errors.donorEmail}
                />
                {errors.donorEmail && (
                  <p className="text-xs text-destructive">{errors.donorEmail}</p>
                )}
              </div>
            </div>

            {/* Amount + Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => update("amount", e.target.value)}
                  placeholder="100.00"
                  aria-invalid={!!errors.amount}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={form.currency}
                  onChange={(e) => update("currency", e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="USD">USD</option>
                  <option value="ZMW">ZMW</option>
                  <option value="KES">KES</option>
                  <option value="UGX">UGX</option>
                  <option value="TZS">TZS</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <select
                id="paymentMethod"
                value={form.paymentMethod}
                onChange={(e) => update("paymentMethod", e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Campaign */}
            {campaigns.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="campaignId">Campaign (optional)</Label>
                <select
                  id="campaignId"
                  value={form.campaignId}
                  onChange={(e) => update("campaignId", e.target.value)}
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

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="donationDate">Donation Date</Label>
              <Input
                id="donationDate"
                type="date"
                value={form.donationDate}
                onChange={(e) => update("donationDate", e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Add any internal notes about this donation..."
                rows={3}
              />
            </div>

            {/* Anonymous */}
            <div className="flex items-center gap-2">
              <input
                id="isAnonymous"
                type="checkbox"
                checked={form.isAnonymous}
                onChange={(e) => update("isAnonymous", e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor="isAnonymous" className="cursor-pointer">
                Record as anonymous donation
              </Label>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={submitting || !orgId}>
                {submitting ? "Recording..." : "Record Donation"}
              </Button>
              <Link href={`/${orgSlug}/admin/donations`}>
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

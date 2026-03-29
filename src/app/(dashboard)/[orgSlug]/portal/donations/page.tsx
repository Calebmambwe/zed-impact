"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Heart } from "lucide-react";

interface Donation {
  id: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  paymentMethod: string;
  createdAt: string;
  donorName: string | null;
  campaign: { name: string } | null;
}

function formatCurrency(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DonorDonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/donor/donations")
      .then((r) => r.json())
      .then((json: { data?: Donation[] }) => setDonations(json.data ?? []))
      .catch(() => setError("Failed to load donations"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">My Donations</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Your complete donation history
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Donation history</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && <p className="text-sm text-destructive py-4">{error}</p>}
          {!loading && !error && donations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Heart className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No donations yet</p>
            </div>
          )}
          {!loading && donations.length > 0 && (
            <div className="divide-y divide-border">
              {donations.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-3.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {d.campaign?.name ?? "General donation"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {d.type === "RECURRING" ? "Recurring" : "One-time"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(d.amount, d.currency)}
                    </p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      Completed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, HandHeart } from "lucide-react";

interface Sponsorship {
  id: string;
  status: string;
  amount: number;
  frequency: string | null;
  startDate: string;
  child: { name: string; age: number | null } | null;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DonorSponsorshipsPage() {
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sponsorships scoped to current user — relies on backend auth
    fetch("/api/donor/impact")
      .then((r) => r.json())
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">My Sponsorships</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Children you are currently sponsoring
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Active sponsorships</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <HandHeart className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">No active sponsorships</p>
              <p className="text-xs text-muted-foreground">
                Sponsor a child to see them here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

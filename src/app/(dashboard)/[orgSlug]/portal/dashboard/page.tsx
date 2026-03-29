"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, HandHeart, TrendingUp, Loader2 } from "lucide-react";

interface ImpactData {
  totalGiven: number;
  donationCount: number;
  activeSponsorships: number;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DonorDashboardPage() {
  const [impact, setImpact] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/donor/impact")
      .then((r) => r.json())
      .then((json: { data?: ImpactData }) => setImpact(json.data ?? null))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: "Total Given",
      value: impact ? formatCurrency(impact.totalGiven) : "$0",
      icon: TrendingUp,
      iconBg: "bg-emerald-500",
    },
    {
      label: "Donations",
      value: impact ? impact.donationCount.toLocaleString() : "0",
      icon: Heart,
      iconBg: "bg-rose-500",
    },
    {
      label: "Sponsorships",
      value: impact ? impact.activeSponsorships.toLocaleString() : "0",
      icon: HandHeart,
      iconBg: "bg-blue-500",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">My Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Your giving summary and impact overview
      </p>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-sm text-white ${stat.iconBg}`}
                  >
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-24 text-center">
            <Heart className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              Your recent donations and sponsorships will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

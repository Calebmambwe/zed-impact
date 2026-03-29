"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Heart, HandHeart, Globe, Loader2 } from "lucide-react";

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

export default function DonorImpactPage() {
  const [impact, setImpact] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/donor/impact")
      .then((r) => r.json())
      .then((json: { data?: ImpactData }) => setImpact(json.data ?? null))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const metrics = [
    {
      label: "Total Contributed",
      value: impact ? formatCurrency(impact.totalGiven) : "$0",
      icon: TrendingUp,
      iconBg: "bg-emerald-500",
      description: "Lifetime giving",
    },
    {
      label: "Donations Made",
      value: impact ? impact.donationCount.toString() : "0",
      icon: Heart,
      iconBg: "bg-rose-500",
      description: "Individual contributions",
    },
    {
      label: "Children Sponsored",
      value: impact ? impact.activeSponsorships.toString() : "0",
      icon: HandHeart,
      iconBg: "bg-blue-500",
      description: "Active sponsorships",
    },
    {
      label: "Communities Reached",
      value: "—",
      icon: Globe,
      iconBg: "bg-amber-500",
      description: "Via programs supported",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">My Impact</h1>
      <p className="text-sm text-muted-foreground mb-6">
        See how your generosity is making a difference
      </p>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-sm text-white ${metric.iconBg}`}
                  >
                    <metric.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-0.5">
                      {metric.label}
                    </p>
                    <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{metric.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Impact story</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your contributions are helping transform lives. Each donation you make goes
            directly toward providing education, healthcare, and essential support to
            children and communities in need. Thank you for your generosity.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

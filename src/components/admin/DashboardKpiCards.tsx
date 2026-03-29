"use client";

import {
  DollarSign,
  Heart,
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useReducedMotion } from "framer-motion";
import { motion, type Variants } from "framer-motion";

// ICON_MAP: icon components cannot cross the server/client boundary.
// Store string names in data, resolve to components here on the client.
const ICON_MAP: Record<string, LucideIcon> = {
  DollarSign,
  Heart,
  Users,
  Target,
};

interface KpiStat {
  label: string;
  value: string;
  icon: string;
  iconBg: string;
  trend?: number;
}

interface DashboardKpiCardsProps {
  stats: KpiStat[];
}

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export function DashboardKpiCards({ stats }: DashboardKpiCardsProps) {
  const prefersReducedMotion = useReducedMotion();
  const isAnimated = !prefersReducedMotion;

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      initial={isAnimated ? "hidden" : false}
      animate="visible"
      variants={stagger}
    >
      {stats.map((stat) => {
        const Icon = ICON_MAP[stat.icon] ?? DollarSign;
        const hasTrend = stat.trend !== undefined && stat.trend !== null;
        const isPositive = (stat.trend ?? 0) >= 0;

        return (
          <motion.div key={stat.label} variants={fadeInUp}>
            <Card className="border shadow-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    {hasTrend && (
                      <p
                        className={`flex items-center gap-1 text-xs mt-1 font-medium ${
                          isPositive ? "text-emerald-600" : "text-rose-500"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {isPositive ? "+" : ""}
                        {stat.trend}% from last month
                      </p>
                    )}
                  </div>
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-sm text-white ${stat.iconBg}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

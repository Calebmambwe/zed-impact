"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReducedMotion } from "framer-motion";
import { motion, type Variants } from "framer-motion";

interface MonthlyDataPoint {
  month: string;
  amount: number;
}

interface PaymentMethodDataPoint {
  name: string;
  value: number;
  color: string;
}

interface RecentDonation {
  id: string;
  amount: number;
  donorName: string | null;
  createdAt: string;
  currency: string;
}

interface DashboardChartsProps {
  monthlyData: MonthlyDataPoint[];
  paymentMethodData: PaymentMethodDataPoint[];
  recentDonations: RecentDonation[];
}

function formatCurrency(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-xl shadow-black/10">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-semibold text-foreground">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
}

interface PieLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

function PiePercentLabel({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  percent = 0,
}: PieLabelProps) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export function DashboardCharts({
  monthlyData,
  paymentMethodData,
  recentDonations,
}: DashboardChartsProps) {
  const prefersReducedMotion = useReducedMotion();
  const isAnimated = !prefersReducedMotion;

  const totalPayments = paymentMethodData.reduce((sum, d) => sum + d.value, 0);

  return (
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      initial={isAnimated ? "hidden" : false}
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={stagger}
    >
      {/* Donation Trend Area Chart */}
      <motion.div variants={fadeInUp} className="lg:col-span-2">
        <Card className="h-full shadow-lg shadow-black/5">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">
              Donation trend
            </CardTitle>
            <p className="text-xs text-muted-foreground">Last 6 months</p>
          </CardHeader>
          <CardContent className="pt-6">
            {monthlyData.length === 0 ? (
              <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                No donation data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={monthlyData}
                  margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                    opacity={0.6}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                    }
                    width={44}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2.5}
                    fill="url(#primaryGradient)"
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: "hsl(var(--chart-1))",
                      stroke: "hsl(var(--card))",
                      strokeWidth: 2,
                    }}
                    isAnimationActive={isAnimated}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment Method Donut */}
      <motion.div variants={fadeInUp}>
        <Card className="h-full shadow-lg shadow-black/5">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">
              Payment methods
            </CardTitle>
            <p className="text-xs text-muted-foreground">By donation count</p>
          </CardHeader>
          <CardContent className="pt-6">
            {paymentMethodData.every((d) => d.value === 0) ? (
              <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                No payment data yet
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5">
                <div className="drop-shadow-md">
                  <PieChart width={176} height={176}>
                    <Pie
                      data={paymentMethodData}
                      cx={84}
                      cy={84}
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={isAnimated}
                      animationBegin={200}
                      animationDuration={700}
                      animationEasing="ease-out"
                      labelLine={false}
                      label={PiePercentLabel}
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="hsl(var(--card))"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </div>
                <div className="w-full space-y-2">
                  {paymentMethodData
                    .filter((d) => d.value > 0)
                    .map((d) => {
                      const pct =
                        totalPayments > 0
                          ? ((d.value / totalPayments) * 100).toFixed(0)
                          : "0";
                      return (
                        <div
                          key={d.name}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: d.color }}
                            />
                            <span className="text-muted-foreground">{d.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{d.value}</span>
                            <span className="text-muted-foreground w-9 text-right">
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Donations */}
      <motion.div variants={fadeInUp} className="lg:col-span-3">
        <Card className="shadow-lg shadow-black/5">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">
              Recent donations
            </CardTitle>
            <p className="text-xs text-muted-foreground">Last 5 completed</p>
          </CardHeader>
          <CardContent className="pt-0">
            {recentDonations.length === 0 ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                No donations yet
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentDonations.map((donation, idx) => (
                  <motion.div
                    key={donation.id}
                    initial={isAnimated ? { opacity: 0, x: -8 } : { opacity: 1, x: 0 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.07, duration: 0.35 }}
                    className="flex items-center justify-between py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-2 ring-primary/10">
                        {getInitials(donation.donorName)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {donation.donorName ?? "Anonymous"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(donation.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(donation.amount, donation.currency)}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, Play, CheckCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const TRUST_ITEMS = [
  "No credit card required",
  "Free 14-day trial",
  "Cancel anytime",
];

export function HeroSection() {
  const shouldReduce = useReducedMotion();

  const containerVariants = shouldReduce ? {} : staggerContainer;
  const itemVariants = shouldReduce ? {} : fadeInUp;

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-24 md:py-36"
      aria-label="Hero"
    >
      {/* Background decoration */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-40 -right-40 size-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 size-[400px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center"
          variants={containerVariants}
          initial={false}
          animate="visible"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Now in public beta
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="mx-auto mt-4 max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
            style={{ lineHeight: 1.1 }}
          >
            Empower Your Nonprofit{" "}
            <span className="gradient-text">with ZedImpact</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={itemVariants}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed"
          >
            The all-in-one platform for nonprofits to manage donations, engage
            donors, run events, track sponsorships, and report on impact — all
            in one place.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Button size="lg" className="h-12 px-8 text-base" render={<Link href="/sign-up" />}>
              Get started free
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base"
              render={<Link href="#features" />}
            >
              <Play className="mr-2 size-4" />
              See how it works
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            variants={itemVariants}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          >
            {TRUST_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="size-4 text-primary" />
                {item}
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Dashboard preview */}
        <motion.div
          initial={false}
          animate={shouldReduce ? {} : { opacity: 1, y: 0 }}
          className="relative mt-20 mx-auto max-w-5xl"
        >
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/10">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-destructive/60" />
                <div className="size-3 rounded-full bg-accent/60" />
                <div className="size-3 rounded-full bg-primary/60" />
              </div>
              <div className="flex-1 rounded-md bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                app.zedimpact.com/demo-org/admin
              </div>
            </div>
            {/* Mock dashboard */}
            <div className="p-6 space-y-4">
              {/* KPI row */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Total Raised", value: "$48,320", change: "+12%" },
                  { label: "Active Donors", value: "1,284", change: "+8%" },
                  { label: "Events", value: "24", change: "+3" },
                  { label: "Campaigns", value: "6", change: "Active" },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{kpi.value}</p>
                    <p className="mt-0.5 text-xs font-medium text-primary">{kpi.change}</p>
                  </div>
                ))}
              </div>
              {/* Chart placeholder */}
              <div className="h-32 rounded-xl border border-border bg-gradient-to-r from-primary/10 via-accent/5 to-primary/5 flex items-center justify-center">
                <div className="flex gap-1 items-end h-16">
                  {[40, 65, 50, 80, 70, 90, 75, 95, 85, 100, 88, 92].map((h, i) => (
                    <div
                      key={i}
                      className="w-4 rounded-t-sm bg-primary/60"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Glow effect under dashboard */}
          <div
            className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 h-20 w-3/4 bg-primary/20 blur-3xl"
            aria-hidden="true"
          />
        </motion.div>
      </div>
    </section>
  );
}

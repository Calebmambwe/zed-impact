"use client";

import {
  Heart,
  Users,
  Calendar,
  Handshake,
  Mail,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { fadeInUp, staggerContainer, defaultViewport } from "@/lib/animations";

const FEATURES = [
  {
    icon: Heart,
    title: "Donation Management",
    description:
      "Accept one-time and recurring donations, run campaigns, issue tax receipts, and track every dollar with real-time reporting.",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  {
    icon: Users,
    title: "Donor CRM",
    description:
      "Manage contacts, segment your donor base, track engagement, and build lasting relationships with powerful CRM tools.",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    icon: Calendar,
    title: "Event Management",
    description:
      "Create ticketed events, handle RSVPs, send reminders, and check in attendees with QR codes on the day of the event.",
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    icon: Handshake,
    title: "Sponsorships",
    description:
      "Manage child and program sponsorships, send impact letters to sponsors, and track every sponsorship lifecycle.",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    icon: Mail,
    title: "Email Campaigns",
    description:
      "Design beautiful email campaigns with our block editor, segment recipients, and track open rates and click-throughs.",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: BarChart3,
    title: "Impact Reports",
    description:
      "Generate compelling impact reports, dashboards, and data exports to share progress with your board and donors.",
    color: "bg-primary/10 text-primary",
  },
];

export function FeaturesSection() {
  const shouldReduce = useReducedMotion();

  return (
    <section
      id="features"
      className="py-24 md:py-32"
      aria-label="Platform features"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          variants={shouldReduce ? {} : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="text-center"
        >
          <motion.p
            variants={shouldReduce ? {} : fadeInUp}
            className="text-sm font-semibold uppercase tracking-wider text-primary"
          >
            Everything you need
          </motion.p>
          <motion.h2
            variants={shouldReduce ? {} : fadeInUp}
            className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            One platform, every tool
          </motion.h2>
          <motion.p
            variants={shouldReduce ? {} : fadeInUp}
            className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground"
          >
            ZedImpact brings together every tool a modern nonprofit needs —
            from fundraising to reporting — in a single, beautiful platform.
          </motion.p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          variants={shouldReduce ? {} : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map(({ icon: Icon, title, description, color }) => (
            <motion.div
              key={title}
              variants={shouldReduce ? {} : fadeInUp}
              className="card-hover group rounded-xl border border-border bg-card p-6 transition-all duration-200"
            >
              <div
                className={`inline-flex size-12 items-center justify-center rounded-xl ${color} mb-4`}
              >
                <Icon className="size-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Learn more <ArrowRight className="size-3.5" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

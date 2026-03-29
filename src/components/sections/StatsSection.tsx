"use client";

import { motion, useReducedMotion } from "framer-motion";
import { fadeInUp, staggerContainer, defaultViewport } from "@/lib/animations";

const STATS = [
  { value: "2,400+", label: "Nonprofits served" },
  { value: "$18M+", label: "Donations processed" },
  { value: "94%", label: "Customer satisfaction" },
  { value: "50+", label: "Countries reached" },
];

export function StatsSection() {
  const shouldReduce = useReducedMotion();

  return (
    <section
      className="border-y border-border bg-muted/30 py-16"
      aria-label="Platform statistics"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.p
          variants={shouldReduce ? {} : fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-10"
        >
          Trusted by nonprofits around the world
        </motion.p>
        <motion.div
          variants={shouldReduce ? {} : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="grid grid-cols-2 gap-8 sm:grid-cols-4"
        >
          {STATS.map(({ value, label }) => (
            <motion.div
              key={label}
              variants={shouldReduce ? {} : fadeInUp}
              className="text-center"
            >
              <p className="text-3xl font-bold text-foreground sm:text-4xl">{value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

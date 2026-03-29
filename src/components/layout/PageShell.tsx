"use client";

import { motion, useReducedMotion } from "framer-motion";
import { fadeInUp, staggerContainer, defaultViewport } from "@/lib/animations";

interface PageShellProps {
  label?: string;
  headline: string;
  description?: string;
  children?: React.ReactNode;
}

/**
 * Shared page shell for marketing content pages.
 * Provides consistent hero header + content area with scroll animations.
 */
export function PageShell({
  label,
  headline,
  description,
  children,
}: PageShellProps) {
  const shouldReduce = useReducedMotion();

  return (
    <div className="min-h-screen">
      {/* Page hero */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={shouldReduce ? undefined : staggerContainer}
            initial={false}
            animate="visible"
            className="text-center"
          >
            {label && (
              <motion.p
                variants={shouldReduce ? undefined : fadeInUp}
                className="text-sm font-semibold uppercase tracking-wider text-primary mb-3"
              >
                {label}
              </motion.p>
            )}
            <motion.h1
              variants={shouldReduce ? undefined : fadeInUp}
              className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl"
            >
              {headline}
            </motion.h1>
            {description && (
              <motion.p
                variants={shouldReduce ? undefined : fadeInUp}
                className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground"
              >
                {description}
              </motion.p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Page content */}
      {children && (
        <motion.section
          variants={shouldReduce ? undefined : fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="py-16 md:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </motion.section>
      )}
    </div>
  );
}

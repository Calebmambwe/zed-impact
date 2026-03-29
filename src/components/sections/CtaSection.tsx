"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { fadeInUp, staggerContainer, defaultViewport } from "@/lib/animations";

export function CtaSection() {
  const shouldReduce = useReducedMotion();

  return (
    <section
      className="py-24 md:py-32"
      aria-label="Call to action"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={shouldReduce ? {} : staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center md:py-24"
        >
          {/* Background decoration */}
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <div className="absolute -top-20 -right-20 size-64 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 size-48 rounded-full bg-white/5 blur-3xl" />
          </div>

          <motion.p
            variants={shouldReduce ? {} : fadeInUp}
            className="relative text-sm font-semibold uppercase tracking-wider text-primary-foreground/70"
          >
            Get started today
          </motion.p>
          <motion.h2
            variants={shouldReduce ? {} : fadeInUp}
            className="relative mt-3 text-3xl font-bold text-primary-foreground sm:text-4xl md:text-5xl"
          >
            Ready to make an impact?
          </motion.h2>
          <motion.p
            variants={shouldReduce ? {} : fadeInUp}
            className="relative mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80"
          >
            Join over 2,400 nonprofits using ZedImpact to streamline their
            operations and amplify their mission.
          </motion.p>
          <motion.div
            variants={shouldReduce ? {} : fadeInUp}
            className="relative mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Button
              size="lg"
              className="h-12 px-8 text-base bg-white text-primary hover:bg-white/90"
              render={<Link href="/sign-up" />}
            >
              Start your free trial
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base border-white/30 text-primary-foreground hover:bg-white/10"
              render={<Link href="/contact" />}
            >
              Talk to sales
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

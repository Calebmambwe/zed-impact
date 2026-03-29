import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { StatsSection } from "@/components/sections/StatsSection";
import { CtaSection } from "@/components/sections/CtaSection";

export const metadata: Metadata = {
  title: "ZedImpact — Nonprofit Management Platform",
  description:
    "ZedImpact empowers nonprofits with modern tools for donations, events, CRM, sponsorships, and impact reporting. Start your free trial today.",
  openGraph: {
    title: "ZedImpact — Nonprofit Management Platform",
    description:
      "Modern tools for nonprofits to manage donations, contacts, events, and impact reporting.",
  },
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <CtaSection />
    </>
  );
}

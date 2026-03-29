import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "About ZedImpact",
  description:
    "Learn about ZedImpact — our mission to empower nonprofits with modern technology, our story, and the team behind the platform.",
  openGraph: {
    title: "About ZedImpact",
    description: "Our mission to empower nonprofits with modern technology.",
  },
};

export default function AboutPage() {
  return (
    <PageShell
      label="Our story"
      headline="Built for nonprofits, by people who care"
      description="ZedImpact was founded with a simple belief: that every nonprofit — regardless of size — deserves access to powerful, affordable tools that let them focus on their mission, not their software."
    >
      <div className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl">
        <h2>Our Mission</h2>
        <p>
          We exist to remove the operational barriers that slow nonprofits down.
          Fragmented tools, manual processes, and expensive enterprise software
          shouldn&#39;t stand between an organization and the communities it serves.
          ZedImpact replaces that complexity with a unified, intuitive platform.
        </p>

        <h2>How We Started</h2>
        <p>
          ZedImpact grew out of a frustration shared by nonprofit founders,
          fundraisers, and program managers. After working with dozens of
          organizations that were stitching together spreadsheets, legacy CRMs,
          and disconnected payment tools, our team set out to build the platform
          we wished had existed.
        </p>
        <p>
          Since launching, ZedImpact has helped organizations across six
          continents manage more than $18 million in donations and engage tens
          of thousands of donors, sponsors, and volunteers.
        </p>

        <h2>Our Values</h2>
        <ul>
          <li>
            <strong>Mission first.</strong> Every product decision starts with:
            does this help nonprofits achieve their mission?
          </li>
          <li>
            <strong>Radical simplicity.</strong> Powerful tools shouldn&#39;t require
            a manual. We design for clarity.
          </li>
          <li>
            <strong>Transparent pricing.</strong> No hidden fees, no confusing
            tiers. You should know exactly what you&#39;re paying.
          </li>
          <li>
            <strong>Customer partnership.</strong> Our best features come
            directly from conversations with the nonprofits we serve.
          </li>
        </ul>

        <h2>Join Us</h2>
        <p>
          We&#39;re growing and always looking for people who believe in the power of
          technology to amplify human good. If that sounds like you,{" "}
          <a href="/contact">get in touch</a>.
        </p>
      </div>
    </PageShell>
  );
}

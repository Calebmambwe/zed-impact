import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { ArrowRight, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights, guides, and updates for nonprofit leaders. Learn how to improve donor engagement, run better events, and grow your impact.",
  openGraph: {
    title: "ZedImpact Blog",
    description: "Insights and guides for nonprofit leaders.",
  },
};

const BLOG_POSTS = [
  {
    slug: "nonprofit-donor-retention-strategies",
    title: "7 Proven Strategies to Improve Donor Retention",
    excerpt:
      "Donor retention is one of the most cost-effective ways to grow your nonprofit. Learn the tactics that top organizations use to keep donors engaged year after year.",
    category: "Fundraising",
    readTime: "6 min read",
    date: "January 15, 2025",
  },
  {
    slug: "effective-nonprofit-email-campaigns",
    title: "How to Write Email Campaigns That Actually Convert",
    excerpt:
      "Email remains the highest-ROI channel for nonprofits. This guide covers subject lines, segmentation, storytelling, and the calls-to-action that drive donations.",
    category: "Email Marketing",
    readTime: "8 min read",
    date: "January 8, 2025",
  },
  {
    slug: "planning-successful-fundraising-events",
    title: "The Complete Guide to Planning a Fundraising Event",
    excerpt:
      "From venue selection to post-event follow-up, this guide walks you through every step of planning a fundraising event that delights attendees and exceeds your goal.",
    category: "Events",
    readTime: "10 min read",
    date: "December 20, 2024",
  },
  {
    slug: "child-sponsorship-program-best-practices",
    title: "Building a Child Sponsorship Program That Lasts",
    excerpt:
      "Learn how leading nonprofits structure their sponsorship programs, communicate impact to sponsors, and create lasting relationships that sustain their mission.",
    category: "Sponsorships",
    readTime: "7 min read",
    date: "December 12, 2024",
  },
  {
    slug: "nonprofit-crm-choosing-right-tool",
    title: "How to Choose the Right CRM for Your Nonprofit",
    excerpt:
      "With dozens of CRM options available, choosing the right one can be overwhelming. Here is what to look for, what to avoid, and how to evaluate your options.",
    category: "Technology",
    readTime: "9 min read",
    date: "December 5, 2024",
  },
  {
    slug: "year-end-giving-campaign-guide",
    title: "How to Maximize Year-End Giving for Your Organization",
    excerpt:
      "Nearly 30% of all charitable giving happens in December. Use this guide to plan your year-end campaign, create urgency, and capture gifts from first-time donors.",
    category: "Fundraising",
    readTime: "5 min read",
    date: "November 28, 2024",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Fundraising: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  "Email Marketing": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Events: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  Sponsorships: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Technology: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export default function BlogPage() {
  return (
    <PageShell
      label="Blog"
      headline="Insights for nonprofit leaders"
      description="Guides, strategies, and updates to help your organization grow its impact."
    >
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BLOG_POSTS.map((post) => (
            <article
              key={post.slug}
              className="card-hover group flex flex-col rounded-xl border border-border bg-card p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[post.category] ?? "bg-muted text-muted-foreground"}`}
                >
                  {post.category}
                </span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {post.readTime}
                </div>
              </div>
              <h2 className="text-base font-semibold text-foreground leading-snug mb-3 group-hover:text-primary transition-colors">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="flex-1 text-sm text-muted-foreground leading-relaxed">
                {post.excerpt}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{post.date}</p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Read more <ArrowRight className="size-3" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

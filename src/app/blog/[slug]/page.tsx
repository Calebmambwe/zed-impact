import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  date: string;
  content: string;
}

const BLOG_POSTS: BlogPost[] = [
  {
    slug: "nonprofit-donor-retention-strategies",
    title: "7 Proven Strategies to Improve Donor Retention",
    description:
      "Donor retention is one of the most cost-effective ways to grow your nonprofit.",
    category: "Fundraising",
    readTime: "6 min read",
    date: "January 15, 2025",
    content: `
Donor retention is the silent metric that separates thriving nonprofits from those that struggle year after year. While many organizations focus obsessively on acquiring new donors, research consistently shows that retaining existing donors is far more cost-effective — typically 5-10x cheaper than finding new ones.

## Why Retention Matters

The average nonprofit retains only about 43% of first-year donors. That means more than half of the people who gave to you this year will never give again. The math is brutal: if you're constantly replacing donors rather than building on them, you're running to stand still.

## 1. Send a Remarkable Thank-You

The fastest way to lose a donor is to make them feel like an ATM. Your thank-you communication should arrive within 48 hours, be personalized, and tell the donor exactly what their gift will accomplish. "Your $75 will provide school supplies for three children in our after-school program" is far more powerful than "Thank you for your generous donation."

## 2. Communicate Impact Consistently

Donors give because they believe in your mission. Keep that belief alive with regular impact updates. Share photos, stories, and specific outcomes that show how their support is making a difference. Aim for at least 4-6 touchpoints per year that are purely about impact — not asks.

## 3. Segment and Personalize

Not all donors are the same. A first-time donor needs different communication than a 10-year sustainer. Use your CRM to segment donors by giving history, interests, and engagement level, then tailor your communications accordingly.

## 4. Create a Midlevel Donor Program

Most organizations focus resources on their major donors and overlook the middle tier — donors giving $250-$5,000 per year. These donors often have both the capacity and interest to give more if they feel properly recognized and engaged. A dedicated midlevel program can significantly lift retention in this segment.

## 5. Make Upgrading Easy

When a donor has given three or four times, they're likely ready to be asked for more. Make the upgrade path simple and compelling. A well-timed "Would you like to join our monthly giving program?" can convert a one-time donor into a sustaining supporter.

## 6. Acknowledge Lapsed Donors Quickly

Once a donor misses their renewal cycle, every month that passes makes reactivation harder. Set up automated alerts to flag lapsed donors after 90 days and deploy a thoughtful reactivation series.

## 7. Ask for Feedback

Donors who are asked for their opinion feel valued and invested. A simple one-question survey — "What matters most to you about supporting us?" — generates insights and strengthens the relationship simultaneously.

## Getting Started

If retention rates feel overwhelming, start small. Pick one segment — your first-time donors — and focus relentlessly on improving their second-gift conversion rate. Even a 10-point improvement in first-to-second-gift conversion can transform your organization's long-term fundraising trajectory.
    `.trim(),
  },
  {
    slug: "effective-nonprofit-email-campaigns",
    title: "How to Write Email Campaigns That Actually Convert",
    description:
      "Email remains the highest-ROI channel for nonprofits. This guide covers subject lines, segmentation, storytelling, and the calls-to-action that drive donations.",
    category: "Email Marketing",
    readTime: "8 min read",
    date: "January 8, 2025",
    content: `
Despite the proliferation of social media, email remains the single most effective digital channel for nonprofit fundraising. Organizations that invest in email see an average return of $42 for every $1 spent. Yet most nonprofits are leaving enormous value on the table by sending generic, infrequent, or poorly structured emails.

## The Anatomy of a High-Converting Email

### Subject Lines That Get Opened

Your subject line determines whether the rest of your email gets read. The best nonprofit subject lines share a few traits:

- **Specific over vague**: "Maria just received her first pair of school shoes" outperforms "Your donation is making a difference"
- **Short for mobile**: Keep subject lines under 50 characters where possible — over 60% of emails are now opened on mobile
- **Tested**: Always A/B test subject lines before sending to your full list

### Opening Lines That Hook

The first two sentences of your email determine whether the reader continues. Lead with a story, a surprising statistic, or an urgent problem. Never start with "I hope this email finds you well."

### The Story Arc

Effective fundraising emails follow a simple structure: problem → solution → proof → ask. Introduce a specific person facing a challenge, show how your organization intervenes, share the outcome, and then ask the reader to make that outcome possible for others.

## Segmentation: The Multiplier Effect

Segmented email campaigns see dramatically higher open rates, click rates, and conversion rates than unsegmented blasts. Start with these basic segments:

- **New donors** (first gift in the last 90 days)
- **Lapsed donors** (no gift in 12+ months)
- **Active sustainers** (monthly giving program)
- **Event attendees** (people who've attended your events)

Each segment deserves its own messaging strategy. New donors need welcoming and impact confirmation. Lapsed donors need reactivation offers. Sustainers need recognition and upgrade asks.

## The Call-to-Action

Every email needs one clear ask. Not three. One. Make the button text specific: "Feed a child for a month" outperforms "Donate now." Place your primary CTA button above the fold and repeat it at the bottom of the email.

## Measuring What Matters

Track these metrics every campaign:
- **Open rate** (benchmark: 26% for nonprofits)
- **Click rate** (benchmark: 3%)
- **Conversion rate** (donations per click)
- **Revenue per email sent** (the ultimate metric)

Optimize for revenue per email sent, not just open rates. An email with a lower open rate but higher conversion from openers may outperform one with a great open rate and poor conversion.
    `.trim(),
  },
];

function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) {
    return { title: "Post Not Found" };
  }
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to blog
        </Link>

        {/* Header */}
        <header className="mb-10">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {post.category}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {post.title}
          </h1>
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="size-4" />
              {post.date}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="size-4" />
              {post.readTime}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          {post.content.split("\n\n").map((paragraph, i) => {
            const trimmed = paragraph.trim();
            if (trimmed.startsWith("## ")) {
              return (
                <h2 key={i} className="mt-8 mb-4 text-xl font-bold text-foreground">
                  {trimmed.slice(3)}
                </h2>
              );
            }
            if (trimmed.startsWith("### ")) {
              return (
                <h3 key={i} className="mt-6 mb-3 text-lg font-semibold text-foreground">
                  {trimmed.slice(4)}
                </h3>
              );
            }
            if (trimmed.startsWith("- ")) {
              const items = trimmed.split("\n").filter((l) => l.startsWith("- "));
              return (
                <ul key={i} className="my-4 space-y-2 pl-5">
                  {items.map((item, j) => (
                    <li key={j} className="text-muted-foreground">
                      {item.slice(2)}
                    </li>
                  ))}
                </ul>
              );
            }
            if (!trimmed) return null;
            return (
              <p key={i} className="my-4 text-muted-foreground leading-relaxed">
                {trimmed}
              </p>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="mt-16 rounded-2xl border border-border bg-primary/5 p-8 text-center">
          <h3 className="text-lg font-semibold text-foreground">
            Ready to put these strategies into practice?
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            ZedImpact gives you the tools to execute every strategy in this article.
          </p>
          <Link
            href="/sign-up"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start your free trial
          </Link>
        </div>
      </div>
    </div>
  );
}

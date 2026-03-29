import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://zedimpact.com";

const STATIC_ROUTES = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/blog", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/sign-in", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/sign-up", priority: 0.6, changeFrequency: "monthly" as const },
];

const BLOG_SLUGS = [
  "nonprofit-donor-retention-strategies",
  "effective-nonprofit-email-campaigns",
  "planning-successful-fundraising-events",
  "child-sponsorship-program-best-practices",
  "nonprofit-crm-choosing-right-tool",
  "year-end-giving-campaign-guide",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(
    ({ path, priority, changeFrequency }) => ({
      url: `${APP_URL}${path}`,
      lastModified: new Date(),
      changeFrequency,
      priority,
    })
  );

  const blogEntries: MetadataRoute.Sitemap = BLOG_SLUGS.map((slug) => ({
    url: `${APP_URL}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...blogEntries];
}

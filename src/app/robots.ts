import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://zedimpact.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/portal/", "/platform-admin/", "/onboarding/"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}

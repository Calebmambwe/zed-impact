import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

// Routes that should render the admin/dashboard shell (no public header/footer)
const DASHBOARD_PATTERNS = [
  "/admin",
  "/portal",
  "/platform-admin",
  "/onboarding",
  "/dashboard",
];

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://zedimpact.com";

export const metadata: Metadata = {
  title: {
    default: "ZedImpact — Nonprofit Management Platform",
    template: "%s | ZedImpact",
  },
  description:
    "ZedImpact empowers nonprofits with modern tools for donations, events, contacts, sponsorships, and impact reporting. Built for organizations making a difference.",
  keywords: [
    "nonprofit management",
    "donation platform",
    "fundraising software",
    "nonprofit CRM",
    "charity tools",
    "event management",
    "donor management",
  ],
  authors: [{ name: "ZedImpact" }],
  creator: "ZedImpact",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "ZedImpact",
    title: "ZedImpact — Nonprofit Management Platform",
    description:
      "Modern tools for nonprofits to manage donations, contacts, events, and impact reporting.",
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "ZedImpact — Nonprofit Management Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZedImpact — Nonprofit Management Platform",
    description: "Modern tools for nonprofits to manage donations, contacts, events, and impact.",
    images: [`${APP_URL}/og-image.png`],
  },
  metadataBase: new URL(APP_URL),
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ZedImpact",
  url: APP_URL,
  logo: `${APP_URL}/logo.png`,
  description: "Nonprofit management platform for donations, CRM, events, and impact reporting.",
  sameAs: [
    "https://twitter.com/zedimpact",
    "https://linkedin.com/company/zedimpact",
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // x-pathname is injected by middleware so we can detect route type server-side
  const pathname = (await headers()).get("x-pathname") ?? "";

  const isDashboard =
    DASHBOARD_PATTERNS.some(
      (pattern) =>
        pathname === pattern || pathname.startsWith(pattern + "/")
    ) || DASHBOARD_PATTERNS.some((p) => pathname.includes(p.slice(1)));

  return (
    <html
      lang="en"
      className={cn("font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
          <ClerkProvider>
            {!isDashboard && <Header />}
            <main className={isDashboard ? undefined : "pt-20"}>{children}</main>
            {!isDashboard && <Footer />}
            <Toaster position="bottom-right" richColors closeButton />
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

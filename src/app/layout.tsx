import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
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

export const metadata: Metadata = {
  title: {
    default: "ZedImpact | Nonprofit Management Platform",
    template: "%s | ZedImpact",
  },
  description:
    "ZedImpact empowers nonprofits with modern tools for donations, events, contacts, and impact reporting.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ZedImpact",
  },
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
      <body className="antialiased">
        <ClerkProvider>
          {!isDashboard && <Header />}
          <main className={isDashboard ? undefined : "pt-20"}>{children}</main>
          {!isDashboard && <Footer />}
          <Toaster position="bottom-right" richColors closeButton />
        </ClerkProvider>
      </body>
    </html>
  );
}

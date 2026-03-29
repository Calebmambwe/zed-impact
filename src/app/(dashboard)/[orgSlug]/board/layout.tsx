"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { BarChart3, DollarSign, Folder, Building2 } from "lucide-react";
import type { ReactNode } from "react";

interface NavItem {
  label: string;
  href: (s: string) => string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: (s) => `/${s}/board`, icon: BarChart3 },
  { label: "Financial", href: (s) => `/${s}/board/financial`, icon: DollarSign },
  { label: "Programs", href: (s) => `/${s}/board/programs`, icon: Folder },
];

export default function BoardLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const pathname = usePathname();

  function isActive(href: string) {
    const base = `/${orgSlug}/board`;
    if (href === base) return pathname === base;
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top navigation */}
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8 h-16">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <Building2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm text-foreground">Board Portal</span>
            </div>

            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const href = item.href(orgSlug);
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

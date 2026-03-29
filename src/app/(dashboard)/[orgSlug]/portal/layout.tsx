"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  LayoutDashboard,
  Heart,
  HandHeart,
  TrendingUp,
  Settings,
} from "lucide-react";
import type { ReactNode } from "react";

interface NavItem {
  label: string;
  href: (s: string) => string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: (s) => `/${s}/portal/dashboard`, icon: LayoutDashboard },
  { label: "My Donations", href: (s) => `/${s}/portal/donations`, icon: Heart },
  { label: "Sponsorships", href: (s) => `/${s}/portal/sponsorships`, icon: HandHeart },
  { label: "Impact", href: (s) => `/${s}/portal/impact`, icon: TrendingUp },
  { label: "Settings", href: (s) => `/${s}/portal/settings`, icon: Settings },
];

export default function PortalLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-sidebar border-r border-border min-h-screen">
        <div className="flex items-center gap-2.5 h-16 px-5 border-b border-border">
          <Heart className="h-5 w-5 text-primary flex-shrink-0" />
          <span className="font-bold text-sm text-foreground truncate">Donor Portal</span>
        </div>
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const href = item.href(orgSlug);
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-card border-t border-border flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const href = item.href(orgSlug);
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 p-6 md:p-8 min-w-0 pb-20 md:pb-8">{children}</main>
    </div>
  );
}

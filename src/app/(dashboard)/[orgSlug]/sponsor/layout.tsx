"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  LayoutDashboard,
  Baby,
  CreditCard,
  Settings,
  Building2,
} from "lucide-react";
import type { ReactNode } from "react";

interface NavItem {
  label: string;
  href: (s: string) => string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: (s) => `/${s}/sponsor`, icon: LayoutDashboard },
  { label: "My Children", href: (s) => `/${s}/sponsor/children`, icon: Baby },
  { label: "Payments", href: (s) => `/${s}/sponsor/payments`, icon: CreditCard },
  { label: "Settings", href: (s) => `/${s}/sponsor/settings`, icon: Settings },
];

export default function SponsorLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const pathname = usePathname();

  function isActive(href: string) {
    const base = `/${orgSlug}/sponsor`;
    if (href === base) return pathname === base;
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-[#1a2e1a] text-white min-h-screen">
        <div className="flex items-center gap-2.5 h-16 px-5 border-b border-white/10">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-500 flex-shrink-0">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-sm truncate block">{orgSlug}</span>
            <span className="text-[10px] text-white/50 uppercase tracking-wide">Sponsor Portal</span>
          </div>
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
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
      <main className="flex-1 p-6 md:p-8 min-w-0">{children}</main>
    </div>
  );
}

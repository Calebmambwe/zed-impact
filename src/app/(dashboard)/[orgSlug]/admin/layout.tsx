"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { LayoutDashboard, Settings, Building2, Heart, Target, FileText } from "lucide-react";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", href: (s: string) => `/${s}/admin`, icon: LayoutDashboard },
  { label: "Donations", href: (s: string) => `/${s}/admin/donations`, icon: Heart },
  { label: "Campaigns", href: (s: string) => `/${s}/admin/campaigns`, icon: Target },
  { label: "Forms", href: (s: string) => `/${s}/admin/forms`, icon: FileText },
  { label: "Settings", href: (s: string) => `/${s}/admin/settings`, icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const pathname = usePathname();

  function isActive(href: string) {
    const base = `/${orgSlug}/admin`;
    if (href === base) return pathname === base;
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-[#1a2e1a] text-white min-h-screen">
        <div className="flex items-center gap-2.5 h-16 px-5 border-b border-white/10">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500 flex-shrink-0">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm truncate">{orgSlug}</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
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
        </nav>
      </aside>
      <main className="flex-1 p-6 md:p-8 min-w-0">{children}</main>
    </div>
  );
}

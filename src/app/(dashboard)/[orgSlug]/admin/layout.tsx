"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Building2,
  Heart,
  Target,
  FileText,
  Users,
  Filter,
  Mail,
  Bell,
  HandHeart,
  Baby,
  Folder,
  GraduationCap,
} from "lucide-react";
import type { ReactNode } from "react";

interface NavItem {
  label: string;
  href: (s: string) => string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: (s) => `/${s}/admin`, icon: LayoutDashboard },
    ],
  },
  {
    label: "Fundraising",
    items: [
      { label: "Donations", href: (s) => `/${s}/admin/donations`, icon: Heart },
      { label: "Campaigns", href: (s) => `/${s}/admin/campaigns`, icon: Target },
      { label: "Forms", href: (s) => `/${s}/admin/forms`, icon: FileText },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Contacts", href: (s) => `/${s}/admin/contacts`, icon: Users },
      { label: "Segments", href: (s) => `/${s}/admin/contacts/segments`, icon: Filter },
    ],
  },
  {
    label: "Programs",
    items: [
      { label: "Sponsorships", href: (s) => `/${s}/admin/sponsorships`, icon: HandHeart },
      { label: "Children", href: (s) => `/${s}/admin/children`, icon: Baby },
      { label: "Programs", href: (s) => `/${s}/admin/programs`, icon: Folder },
      { label: "Schools", href: (s) => `/${s}/admin/schools`, icon: GraduationCap },
      { label: "Letters", href: (s) => `/${s}/admin/letters`, icon: Mail },
    ],
  },
  {
    label: "Communications",
    items: [
      { label: "Email", href: (s) => `/${s}/admin/email`, icon: Mail },
      { label: "Subscribers", href: (s) => `/${s}/admin/subscribers`, icon: Bell },
    ],
  },
  {
    label: "Organization",
    items: [
      { label: "Settings", href: (s) => `/${s}/admin/settings`, icon: Settings },
    ],
  },
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
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/30">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
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
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6 md:p-8 min-w-0">{children}</main>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { LayoutDashboard, Building2, Users, ScrollText } from "lucide-react";

const NAV_ITEMS = [
  { href: "/platform-admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/platform-admin/orgs", label: "Organizations", icon: Building2 },
  { href: "/platform-admin/users", label: "Users", icon: Users },
  { href: "/platform-admin/audit-log", label: "Audit Log", icon: ScrollText },
];

/**
 * Platform admin shell layout.
 * Requires SUPER_ADMIN platform role — redirects to /sign-in otherwise.
 */
export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole("SUPER_ADMIN");
  } catch {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r bg-white">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <span className="text-lg font-semibold text-primary">ZedImpact</span>
          <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
            Admin
          </span>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center border-b bg-white px-8">
          <h1 className="text-sm font-medium text-muted-foreground">
            Platform Administration
          </h1>
        </header>
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}

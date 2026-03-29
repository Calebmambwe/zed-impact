import type { ReactNode } from "react";

/**
 * Simple public-facing layout for org donation pages.
 * No sidebar or admin chrome — clean donor experience.
 */
export default function PublicOrgLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main>{children}</main>
    </div>
  );
}

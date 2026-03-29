import Link from "next/link";
import { Leaf } from "lucide-react";

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Changelog", href: "/changelog" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

/**
 * Public-facing site footer for ZedImpact.
 */
export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold text-base">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Leaf className="size-3.5" />
              </span>
              <span>ZedImpact</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Modern tools for nonprofits that want to make a bigger impact.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {section}
              </h3>
              <ul className="mt-3 space-y-2">
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} ZedImpact. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built for nonprofits that move the world forward.
          </p>
        </div>
      </div>
    </footer>
  );
}

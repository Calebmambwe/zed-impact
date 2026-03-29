import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/ContactForm";
import { PageShell } from "@/components/layout/PageShell";
import { Mail, Phone, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the ZedImpact team. We're here to help nonprofits succeed.",
  openGraph: {
    title: "Contact ZedImpact",
    description: "Reach out to us with questions, feedback, or to schedule a demo.",
  },
};

const CONTACT_INFO = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@zedimpact.com",
    href: "mailto:hello@zedimpact.com",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+1 (888) 933-4672",
    href: "tel:+18889334672",
  },
  {
    icon: MapPin,
    label: "Address",
    value: "Remote-first team serving nonprofits worldwide",
    href: undefined,
  },
];

export default function ContactPage() {
  return (
    <PageShell
      label="Get in touch"
      headline="We'd love to hear from you"
      description="Have a question, want to schedule a demo, or just want to say hi? Send us a message and we'll get back to you within one business day."
    >
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Contact info */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Contact information
            </h2>
            <div className="space-y-6">
              {CONTACT_INFO.map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    {href ? (
                      <a
                        href={href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-xl border border-border bg-muted/30 p-6">
              <h3 className="font-semibold text-foreground mb-2">Need a demo?</h3>
              <p className="text-sm text-muted-foreground">
                Book a 30-minute live demo with one of our nonprofit success
                specialists. We&#39;ll walk you through the platform and answer
                every question.
              </p>
              <a
                href="mailto:demo@zedimpact.com"
                className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
              >
                Request a demo &rarr;
              </a>
            </div>
          </div>

          {/* Contact form */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Send us a message
            </h2>
            <ContactForm />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

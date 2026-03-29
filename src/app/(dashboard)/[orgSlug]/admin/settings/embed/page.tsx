"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://zedimpact.com";

interface EmbedSnippet {
  title: string;
  description: string;
  code: (slug: string) => string;
}

const EMBED_SNIPPETS: EmbedSnippet[] = [
  {
    title: "Donation Widget",
    description: "Embed a donation form on any webpage. Donors can give directly from your website.",
    code: (slug) =>
      `<iframe\n  src="${APP_URL}/${slug}/donate/embed"\n  width="100%"\n  height="600"\n  frameborder="0"\n  style="border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.1);"\n  title="Donate to our cause"\n  loading="lazy"\n></iframe>`,
  },
  {
    title: "Campaign Progress Widget",
    description: "Show real-time progress toward your fundraising campaign goal.",
    code: (slug) =>
      `<iframe\n  src="${APP_URL}/${slug}/campaigns/embed"\n  width="100%"\n  height="200"\n  frameborder="0"\n  style="border-radius: 8px;"\n  title="Campaign progress"\n  loading="lazy"\n></iframe>`,
  },
  {
    title: "Event Registration Widget",
    description: "Let visitors register for your events directly from your website.",
    code: (slug) =>
      `<iframe\n  src="${APP_URL}/${slug}/events/embed"\n  width="100%"\n  height="500"\n  frameborder="0"\n  style="border-radius: 12px;"\n  title="Register for our events"\n  loading="lazy"\n></iframe>`,
  },
  {
    title: "Child Sponsorship Widget",
    description: "Display available children for sponsorship on your marketing site.",
    code: (slug) =>
      `<iframe\n  src="${APP_URL}/${slug}/sponsor/embed"\n  width="100%"\n  height="700"\n  frameborder="0"\n  style="border-radius: 12px;"\n  title="Sponsor a child"\n  loading="lazy"\n></iframe>`,
  },
];

export default function EmbedSettingsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const [copied, setCopied] = useState<string | null>(null);

  function copyCode(title: string, code: string) {
    void navigator.clipboard.writeText(code);
    setCopied(title);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Embed Widgets</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Embed ZedImpact widgets on your website, blog, or any page that accepts
        HTML.
      </p>

      <div className="max-w-2xl space-y-6">
        {EMBED_SNIPPETS.map(({ title, description, code }) => {
          const snippet = code(orgSlug);
          return (
            <Card key={title}>
              <CardHeader>
                <CardTitle className="text-sm">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs font-mono text-muted-foreground">
                    <code>{snippet}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute right-2 top-2"
                    onClick={() => copyCode(title, snippet)}
                  >
                    {copied === title ? (
                      <>
                        <Check className="mr-1.5 size-3.5 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1.5 size-3.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Mail, Phone, Calendar, DollarSign, Activity, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ContactActivity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
}

interface ContactDonation {
  id: string;
  amount: number;
  currency: string;
  createdAt: string;
}

interface ContactDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  type: string;
  status: string;
  lifetimeValue: number;
  lastDonationAt: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  createdAt: string;
  activity: ContactActivity[];
  donations: ContactDonation[];
  tags: Array<{ id: string; name: string; color: string | null }>;
}

interface ContactResponse {
  success: boolean;
  data: ContactDetail | null;
  error: { code: string; message: string } | null;
}

async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function activityIcon(type: string) {
  if (type.includes("donation")) return <DollarSign className="h-3.5 w-3.5" />;
  if (type.includes("note")) return <Activity className="h-3.5 w-3.5" />;
  return <Activity className="h-3.5 w-3.5" />;
}

export default function ContactDetailPage() {
  const params = useParams<{ orgSlug: string; contactId: string }>();
  const orgSlug = params.orgSlug ?? "";
  const contactId = params.contactId ?? "";
  const router = useRouter();

  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const orgId = await resolveOrgId(orgSlug);
      if (!orgId) {
        setError("Organization not found");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/orgs/${orgId}/contacts/${contactId}`);
        if (res.status === 401 || res.status === 403) {
          router.push(`/${orgSlug}/admin`);
          return;
        }
        const json = await res.json() as ContactResponse;
        if (!json.success || !json.data) {
          setError(json.error?.message ?? "Contact not found");
          return;
        }
        setContact(json.data);
      } catch {
        setError("Failed to load contact");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [orgSlug, contactId, router]);

  if (loading) {
    return (
      <div className="py-32 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading contact…
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="py-32 text-center">
        <p className="text-sm text-destructive mb-4">{error ?? "Contact not found"}</p>
        <Link href={`/${orgSlug}/admin/contacts`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Contacts
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/admin/contacts`}>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Contacts
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold text-foreground">
          {contact.firstName} {contact.lastName}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Contact details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Full Name
                  </p>
                  <p className="text-sm text-foreground font-medium">
                    {contact.firstName} {contact.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Type
                  </p>
                  <p className="text-sm text-foreground capitalize">
                    {contact.type.toLowerCase()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Email
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {contact.email ?? <span className="text-muted-foreground/60">Not provided</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Phone
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {contact.phone ?? <span className="text-muted-foreground/60">Not provided</span>}
                  </div>
                </div>
                {(contact.city || contact.country) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Location
                    </p>
                    <p className="text-sm text-foreground">
                      {[contact.city, contact.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Added
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {new Date(contact.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {contact.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    Notes
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{contact.notes}</p>
                </div>
              )}

              {contact.tags.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground"
                        style={tag.color ? { backgroundColor: `${tag.color}20`, color: tag.color } : {}}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity timeline */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {contact.activity.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No activity yet
                </div>
              ) : (
                <ul className="divide-y">
                  {contact.activity.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        {activityIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Giving summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Giving Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Lifetime Value
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(contact.lifetimeValue)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Last Donation
                </p>
                <p className="text-sm text-foreground">
                  {contact.lastDonationAt
                    ? new Date(contact.lastDonationAt).toLocaleDateString()
                    : "Never"}
                </p>
              </div>
            </CardContent>
          </Card>

          {contact.donations.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm font-medium">Recent Donations</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {contact.donations.map((d) => (
                    <li key={d.id} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-muted-foreground">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(d.amount, d.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

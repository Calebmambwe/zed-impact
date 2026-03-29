"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Search, Plus, Filter, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  type: string;
  lifetimeValue: number;
  lastDonationAt: string | null;
  status: string;
}

interface ContactsResponse {
  success: boolean;
  data: { contacts: Contact[] } | null;
  error: { code: string; message: string } | null;
  meta?: { page: number; limit: number; total: number };
}

async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "DONOR", label: "Donor" },
  { value: "VOLUNTEER", label: "Volunteer" },
  { value: "SPONSOR", label: "Sponsor" },
  { value: "STAFF", label: "Staff" },
  { value: "BOARD", label: "Board" },
  { value: "OTHER", label: "Other" },
];

function typeBadge(type: string) {
  const styles: Record<string, string> = {
    DONOR: "bg-blue-100 text-blue-700",
    VOLUNTEER: "bg-green-100 text-green-700",
    SPONSOR: "bg-purple-100 text-purple-700",
    STAFF: "bg-orange-100 text-orange-700",
    BOARD: "bg-amber-100 text-amber-700",
    OTHER: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[type] ?? "bg-muted text-muted-foreground"}`}
    >
      {type.charAt(0) + type.slice(1).toLowerCase()}
    </span>
  );
}

export default function ContactsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchContacts = useCallback(async (id: string, page = 1, searchVal = "", typeVal = "") => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`/api/orgs/${id}/contacts`, window.location.origin);
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", "20");
      if (searchVal) url.searchParams.set("search", searchVal);
      if (typeVal) url.searchParams.set("type", typeVal);

      const res = await fetch(url.toString());
      if (res.status === 401 || res.status === 403) {
        router.push(`/${orgSlug}/admin`);
        return;
      }
      const json = await res.json() as ContactsResponse;
      if (!json.success || !json.data) {
        setError(json.error?.message ?? "Failed to load contacts");
        return;
      }
      setContacts(json.data.contacts);
      setMeta(json.meta ?? null);
    } catch {
      setError("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [orgSlug, router]);

  useEffect(() => {
    resolveOrgId(orgSlug).then((id) => {
      if (!id) {
        setError("Organization not found");
        setLoading(false);
        return;
      }
      setOrgId(id);
      fetchContacts(id);
    });
  }, [orgSlug, fetchContacts]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    if (orgId) fetchContacts(orgId, 1, searchInput, typeFilter);
  }

  function handleTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setTypeFilter(val);
    if (orgId) fetchContacts(orgId, 1, search, val);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage donors, volunteers, sponsors, and all contacts
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${orgSlug}/admin/contacts/import`}>
            <Button variant="outline" size="sm">Import CSV</Button>
          </Link>
          <Link href={`/${orgSlug}/admin/contacts/segments`}>
            <Button variant="outline" size="sm">
              <Filter className="h-3.5 w-3.5" />
              Segments
            </Button>
          </Link>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">Search</Button>
        </form>
        <select
          value={typeFilter}
          onChange={handleTypeChange}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Filter by type"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Contacts
            {meta && (
              <span className="text-muted-foreground font-normal">
                ({meta.total.toLocaleString()} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="py-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading contacts…
            </div>
          )}
          {!loading && error && (
            <div className="py-16 text-center text-sm text-destructive">{error}</div>
          )}
          {!loading && !error && contacts.length === 0 && (
            <div className="py-16 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No contacts yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Import a CSV or add contacts manually.
              </p>
              <Link href={`/${orgSlug}/admin/contacts/import`} className="mt-4 inline-block">
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  Import Contacts
                </Button>
              </Link>
            </div>
          )}
          {!loading && !error && contacts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      Lifetime Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                      Last Donation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contacts.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => router.push(`/${orgSlug}/admin/contacts/${c.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {c.firstName} {c.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {c.email ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        {c.email ?? <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3">{typeBadge(c.type)}</td>
                      <td className="px-4 py-3 hidden md:table-cell font-medium text-foreground">
                        {formatCurrency(c.lifetimeValue)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {c.lastDonationAt
                          ? new Date(c.lastDonationAt).toLocaleDateString()
                          : <span className="text-muted-foreground/50">Never</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {meta && meta.total > meta.limit && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Page {meta.page} of {Math.ceil(meta.total / meta.limit)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={meta.page <= 1}
                      onClick={() => orgId && fetchContacts(orgId, meta.page - 1, search, typeFilter)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={meta.page >= Math.ceil(meta.total / meta.limit)}
                      onClick={() => orgId && fetchContacts(orgId, meta.page + 1, search, typeFilter)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

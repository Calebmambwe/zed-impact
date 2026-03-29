"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Baby, Search, MapPin, Loader2, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AvailableChild {
  id: string;
  firstName: string;
  lastName: string;
  age: number | null;
  gender: string | null;
  location: string | null;
  story: string | null;
  sponsorshipAmount: number | null;
  currency: string;
  program: { name: string } | null;
  orgSlug: string;
}

interface BrowseResponse {
  success: boolean;
  data: AvailableChild[] | null;
  error: { code: string; message: string } | null;
  meta?: { page: number; limit: number; total: number };
}

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SponsorBrowsePage() {
  const [children, setChildren] = useState<AvailableChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null);

  async function fetchChildren(page = 1, searchVal = "") {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/public/children", window.location.origin);
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", "12");
      url.searchParams.set("available", "true");
      if (searchVal) url.searchParams.set("search", searchVal);

      const res = await fetch(url.toString());
      if (res.status === 404) {
        // Fallback: try the demo-org endpoint
        const fallback = await fetch("/api/public/orgs/demo-org/children?available=true");
        if (fallback.ok) {
          const json = await fallback.json() as BrowseResponse;
          setChildren(json.data ?? []);
          setMeta(json.meta ?? null);
          return;
        }
        setChildren([]);
        return;
      }
      const json = await res.json() as BrowseResponse;
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load children");
        return;
      }
      setChildren(json.data ?? []);
      setMeta(json.meta ?? null);
    } catch {
      setError("Failed to load available children");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchChildren(1, search);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-[#1a2e1a] text-white py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/80 mb-6">
            <Heart className="h-3.5 w-3.5" />
            Child Sponsorship
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Sponsor a Child
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            Your monthly gift provides education, healthcare, and hope for a child in need.
            Choose a child to sponsor and start making a lasting difference.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Search */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or location…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline">Search</Button>
          </form>
          {meta && (
            <p className="text-xs text-muted-foreground mt-3">
              {meta.total} {meta.total === 1 ? "child" : "children"} available for sponsorship
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-24 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading available children…
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="py-24 text-center">
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button onClick={() => fetchChildren()} variant="outline">Try again</Button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && children.length === 0 && (
          <div className="py-24 text-center">
            <Baby className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-base font-medium text-foreground">No children available right now</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? "Try a different search term." : "Check back soon — new children are added regularly."}
            </p>
            {search && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={() => { setSearch(""); setSearchInput(""); }}
              >
                Clear search
              </Button>
            )}
          </div>
        )}

        {/* Grid */}
        {!loading && !error && children.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {children.map((child) => (
                <Card
                  key={child.id}
                  className="hover:-translate-y-1 hover:shadow-xl transition-all duration-200 overflow-hidden"
                >
                  {/* Photo placeholder */}
                  <div className="aspect-[4/3] bg-primary/10 flex items-center justify-center">
                    <Baby className="h-16 w-16 text-primary/40" />
                  </div>
                  <CardContent className="pt-4 pb-5">
                    <h3 className="font-semibold text-foreground">
                      {child.firstName} {child.lastName}
                    </h3>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {(child.age != null || child.gender) && (
                        <p>
                          {[
                            child.age != null ? `Age ${child.age}` : null,
                            child.gender
                              ? child.gender.charAt(0) + child.gender.slice(1).toLowerCase()
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {child.location && (
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {child.location}
                        </p>
                      )}
                      {child.program && <p>{child.program.name}</p>}
                    </div>
                    {child.story && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                        {child.story}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      {child.sponsorshipAmount != null ? (
                        <p className="text-sm font-bold text-primary">
                          {formatCurrency(child.sponsorshipAmount, child.currency)}/mo
                        </p>
                      ) : (
                        <span />
                      )}
                      <Link href={`/${child.orgSlug}/sponsor`}>
                        <Button size="sm">Sponsor</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {meta && meta.total > meta.limit && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <Button
                  variant="outline"
                  disabled={meta.page <= 1}
                  onClick={() => fetchChildren(meta.page - 1, search)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {meta.page} of {Math.ceil(meta.total / meta.limit)}
                </span>
                <Button
                  variant="outline"
                  disabled={meta.page >= Math.ceil(meta.total / meta.limit)}
                  onClick={() => fetchChildren(meta.page + 1, search)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

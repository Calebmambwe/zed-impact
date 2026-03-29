"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Filter, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FilterRow {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface SegmentResponse {
  success: boolean;
  data: { id: string } | null;
  error: { code: string; message: string } | null;
}

const FIELD_OPTIONS = [
  { value: "type", label: "Contact Type" },
  { value: "status", label: "Status" },
  { value: "lifetimeValue", label: "Lifetime Value" },
  { value: "lastDonationAt", label: "Last Donation Date" },
  { value: "country", label: "Country" },
];

const OPERATOR_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  type: [
    { value: "eq", label: "is" },
    { value: "neq", label: "is not" },
  ],
  status: [
    { value: "eq", label: "is" },
    { value: "neq", label: "is not" },
  ],
  lifetimeValue: [
    { value: "gt", label: "greater than" },
    { value: "lt", label: "less than" },
    { value: "eq", label: "equals" },
  ],
  lastDonationAt: [
    { value: "gt", label: "after" },
    { value: "lt", label: "before" },
  ],
  country: [
    { value: "eq", label: "is" },
    { value: "contains", label: "contains" },
  ],
};

const DEFAULT_OPERATORS = [
  { value: "eq", label: "equals" },
  { value: "contains", label: "contains" },
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

export default function NewSegmentPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [filters, setFilters] = useState<FilterRow[]>([
    { id: uid(), field: "type", operator: "eq", value: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addFilter() {
    setFilters((prev) => [
      ...prev,
      { id: uid(), field: "type", operator: "eq", value: "" },
    ]);
  }

  function removeFilter(id: string) {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  }

  function updateFilter(id: string, key: keyof Omit<FilterRow, "id">, value: string) {
    setFilters((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        if (key === "field") {
          const ops = OPERATOR_OPTIONS[value] ?? DEFAULT_OPERATORS;
          return { ...f, field: value, operator: ops[0].value, value: "" };
        }
        return { ...f, [key]: value };
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Segment name is required");
      return;
    }
    if (filters.length === 0) {
      setError("Add at least one filter");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const orgId = await resolveOrgId(orgSlug);
      if (!orgId) {
        setError("Organization not found");
        return;
      }

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        filters: filters.map(({ field, operator, value }) => ({ field, operator, value })),
      };

      const res = await fetch(`/api/orgs/${orgId}/contacts/segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json() as SegmentResponse;
      if (!json.success) {
        setError(json.error?.message ?? "Failed to create segment");
        return;
      }

      router.push(`/${orgSlug}/admin/contacts/segments`);
    } catch {
      setError("Failed to create segment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/admin/contacts/segments`}>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Segments
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold text-foreground">New Segment</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm font-medium">Segment Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="seg-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="seg-name"
                placeholder="e.g. Major Donors"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seg-desc">Description</Label>
              <Input
                id="seg-desc"
                placeholder="Optional description…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-3">
            {filters.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No filters yet. Add one below.
              </p>
            )}

            {filters.map((row, idx) => {
              const ops = OPERATOR_OPTIONS[row.field] ?? DEFAULT_OPERATORS;
              return (
                <div key={row.id} className="flex items-center gap-2 flex-wrap">
                  {idx === 0 ? (
                    <span className="text-xs font-medium text-muted-foreground w-12 shrink-0">
                      Where
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground w-12 shrink-0">
                      And
                    </span>
                  )}

                  <select
                    value={row.field}
                    onChange={(e) => updateFilter(row.id, "field", e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    aria-label="Filter field"
                  >
                    {FIELD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>

                  <select
                    value={row.operator}
                    onChange={(e) => updateFilter(row.id, "operator", e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    aria-label="Filter operator"
                  >
                    {ops.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>

                  <Input
                    placeholder="Value"
                    value={row.value}
                    onChange={(e) => updateFilter(row.id, "value", e.target.value)}
                    className="flex-1 min-w-[120px]"
                    aria-label="Filter value"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeFilter(row.id)}
                    aria-label="Remove filter"
                    disabled={filters.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addFilter}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Filter
            </Button>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Filter className="h-4 w-4" />
                Create Segment
              </>
            )}
          </Button>
          <Link href={`/${orgSlug}/admin/contacts/segments`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

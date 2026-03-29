"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, ExternalLink, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DonationForm {
  id: string;
  name: string;
  slug: string;
  isPublished: boolean;
  campaignId: string | null;
  createdAt: string;
  updatedAt: string;
  campaign?: { id: string; name: string } | null;
}

interface FormsResponse {
  success: boolean;
  data: DonationForm[] | null;
  error: { code: string; message: string } | null;
}

export default function FormsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [forms, setForms] = useState<DonationForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForms = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${id}/forms`);
      if (res.status === 401 || res.status === 403) {
        router.push(`/${orgSlug}/admin`);
        return;
      }
      const json = await res.json() as FormsResponse;
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load forms");
        return;
      }
      setForms(json.data ?? []);
    } catch {
      setError("Failed to load forms");
    } finally {
      setLoading(false);
    }
  }, [orgSlug, router]);

  useEffect(() => {
    async function init() {
      const res = await fetch(`/api/public/orgs/${orgSlug}`);
      if (!res.ok) { setLoading(false); return; }
      const json = await res.json() as { success: boolean; data: { id: string } | null };
      const id = json.data?.id;
      if (!id) { setLoading(false); return; }
      setOrgId(id);
      fetchForms(id);
    }
    init();
  }, [orgSlug, fetchForms]);

  async function togglePublished(form: DonationForm) {
    if (!orgId) return;
    try {
      await fetch(`/api/orgs/${orgId}/forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !form.isPublished }),
      });
      // Optimistic update
      setForms((prev) =>
        prev.map((f) => (f.id === form.id ? { ...f, isPublished: !f.isPublished } : f))
      );
    } catch {
      // Revert on error — re-fetch
      fetchForms(orgId);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Donation Forms</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Build and publish custom donation forms for your donors
          </p>
        </div>
        <Link href={`/${orgSlug}/admin/forms/new`}>
          <Button>
            <Plus className="h-4 w-4" />
            New Form
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Loading forms...
        </div>
      )}

      {!loading && error && (
        <div className="py-16 text-center text-sm text-destructive">{error}</div>
      )}

      {!loading && !error && forms.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No forms yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create a donation form to share with your donors.
            </p>
            <Link href={`/${orgSlug}/admin/forms/new`} className="mt-4 inline-block">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" />
                New Form
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!loading && !error && forms.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              All Forms
              <span className="text-muted-foreground font-normal">
                ({forms.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between px-4 py-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {form.name}
                      </span>
                      {form.isPublished ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                          Draft
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">/{form.slug}</span>
                      {form.campaign && (
                        <>
                          <span className="text-muted-foreground/40">&middot;</span>
                          <span className="text-xs text-muted-foreground">
                            {form.campaign.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {form.isPublished && (
                      <a
                        href={`/${orgSlug}/donate/${form.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="icon-sm" title="View public form">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePublished(form)}
                      title={form.isPublished ? "Unpublish" : "Publish"}
                    >
                      {form.isPublished ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          Publish
                        </>
                      )}
                    </Button>
                    <Link href={`/${orgSlug}/admin/forms/${form.id}`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

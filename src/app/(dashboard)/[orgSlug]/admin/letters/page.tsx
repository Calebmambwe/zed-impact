"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Mail, Check, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Letter {
  id: string;
  subject: string;
  direction: "INCOMING" | "OUTGOING";
  status: "PENDING" | "APPROVED" | "REJECTED" | "SENT";
  createdAt: string;
  child: { id: string; firstName: string; lastName: string } | null;
  sender: { firstName: string; lastName: string } | null;
}

interface LettersResponse {
  success: boolean;
  data: { letters: Letter[] } | null;
  error: { code: string; message: string } | null;
  meta?: { page: number; limit: number; total: number };
}

async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

function directionBadge(direction: string) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        direction === "INCOMING"
          ? "bg-blue-100 text-blue-700"
          : "bg-purple-100 text-purple-700"
      }`}
    >
      {direction === "INCOMING" ? "Incoming" : "Outgoing"}
    </span>
  );
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    SENT: "bg-blue-100 text-blue-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default function LettersPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchLetters = useCallback(async (id: string, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${id}/letters?page=${page}&limit=20&status=PENDING`);
      if (res.status === 401 || res.status === 403) {
        router.push(`/${orgSlug}/admin`);
        return;
      }
      if (res.status === 404) {
        setLetters([]);
        setLoading(false);
        return;
      }
      const json = await res.json() as LettersResponse;
      if (!json.success || !json.data) {
        setError(json.error?.message ?? "Failed to load letters");
        return;
      }
      setLetters(json.data.letters);
      setMeta(json.meta ?? null);
    } catch {
      setError("Failed to load letters");
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
      fetchLetters(id);
    });
  }, [orgSlug, fetchLetters]);

  async function handleAction(letterId: string, action: "approve" | "reject") {
    if (!orgId) return;
    setActionLoading(letterId);
    try {
      const res = await fetch(`/api/orgs/${orgId}/letters/${letterId}/${action}`, {
        method: "POST",
      });
      if (res.ok) {
        setLetters((prev) => prev.filter((l) => l.id !== letterId));
      }
    } catch {
      // silently fail — UI remains
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Letter Moderation</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and approve letters between sponsors and children
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Pending Letters
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
              Loading letters…
            </div>
          )}
          {!loading && error && (
            <div className="py-16 text-center text-sm text-destructive">{error}</div>
          )}
          {!loading && !error && letters.length === 0 && (
            <div className="py-16 text-center">
              <Mail className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No letters pending review</p>
              <p className="text-xs text-muted-foreground mt-1">
                All letters have been moderated or none have been submitted.
              </p>
            </div>
          )}
          {!loading && !error && letters.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                      Direction
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      Child
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {letters.map((letter) => (
                    <tr key={letter.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground line-clamp-1">
                          {letter.subject || "No subject"}
                        </div>
                        {letter.sender && (
                          <div className="text-xs text-muted-foreground">
                            From: {letter.sender.firstName} {letter.sender.lastName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {directionBadge(letter.direction)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {letter.child
                          ? `${letter.child.firstName} ${letter.child.lastName}`
                          : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3">{statusBadge(letter.status)}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {new Date(letter.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {letter.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-green-700 border-green-200 hover:bg-green-50"
                                disabled={actionLoading === letter.id}
                                onClick={() => handleAction(letter.id, "approve")}
                                aria-label={`Approve letter: ${letter.subject}`}
                              >
                                {actionLoading === letter.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-destructive border-destructive/20 hover:bg-destructive/10"
                                disabled={actionLoading === letter.id}
                                onClick={() => handleAction(letter.id, "reject")}
                                aria-label={`Reject letter: ${letter.subject}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
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
                      onClick={() => orgId && fetchLetters(orgId, meta.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={meta.page >= Math.ceil(meta.total / meta.limit)}
                      onClick={() => orgId && fetchLetters(orgId, meta.page + 1)}
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

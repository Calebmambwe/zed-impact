"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Flag, Plus, Trash2 } from "lucide-react";

interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: string;
}

export default function FeatureFlagsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";

  const [orgId, setOrgId] = useState<string | null>(null);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFlagName, setNewFlagName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgSlug) return;
    fetch(`/api/public/orgs/${orgSlug}`)
      .then((r) => r.json())
      .then((json: { data?: { id?: string } }) => {
        const id = json.data?.id;
        if (!id) throw new Error("Org not found");
        setOrgId(id);
        return fetch(`/api/admin/flags?orgId=${id}`);
      })
      .then((r) => r?.json())
      .then((json: { data?: FeatureFlag[] }) => {
        setFlags(json.data ?? []);
      })
      .catch(() => setError("Failed to load feature flags"))
      .finally(() => setLoading(false));
  }, [orgSlug]);

  async function toggleFlag(flagId: string, currentEnabled: boolean) {
    if (!orgId) return;
    const res = await fetch(`/api/admin/flags/${flagId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, enabled: !currentEnabled }),
    });
    if (res.ok) {
      setFlags((prev) =>
        prev.map((f) => (f.id === flagId ? { ...f, enabled: !currentEnabled } : f))
      );
    }
  }

  async function deleteFlag(flagId: string) {
    if (!orgId) return;
    const res = await fetch(`/api/admin/flags/${flagId}?orgId=${orgId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setFlags((prev) => prev.filter((f) => f.id !== flagId));
    }
  }

  async function createFlag(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !newFlagName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, name: newFlagName.trim(), enabled: false }),
      });
      const json = (await res.json()) as { data?: FeatureFlag };
      if (json.data) {
        setFlags((prev) => [...prev, json.data!]);
        setNewFlagName("");
      }
    } catch {
      setError("Failed to create flag");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Feature Flags</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Enable or disable features for your organization
      </p>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Create new flag</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createFlag} className="flex gap-3">
              <Input
                value={newFlagName}
                onChange={(e) => setNewFlagName(e.target.value)}
                placeholder="FEATURE_NAME"
                className="font-mono"
              />
              <Button type="submit" disabled={creating || !newFlagName.trim()}>
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Feature flags</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && flags.length === 0 && (
              <div className="flex flex-col items-center justify-center h-24 text-center">
                <Flag className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No feature flags yet</p>
              </div>
            )}
            {!loading && flags.length > 0 && (
              <div className="divide-y divide-border">
                {flags.map((flag) => (
                  <div key={flag.id} className="flex items-center justify-between py-3.5">
                    <div>
                      <p className="text-sm font-mono font-medium text-foreground">
                        {flag.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(flag.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleFlag(flag.id, flag.enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          flag.enabled ? "bg-primary" : "bg-muted"
                        }`}
                        role="switch"
                        aria-checked={flag.enabled}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            flag.enabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => deleteFlag(flag.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Delete flag"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

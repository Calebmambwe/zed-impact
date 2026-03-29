"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Key, Plus, Trash2, Eye, EyeOff, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface NewKeyResult {
  id: string;
  name: string;
  keyPrefix: string;
  secret: string;
  createdAt: string;
  lastUsedAt: null;
}

export default function ApiKeysSettingsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (!orgSlug) return;
    fetch(`/api/orgs/${orgSlug}/settings/api-keys`)
      .then((r) => r.json())
      .then((json: { data?: ApiKey[] }) => setKeys(json.data ?? []))
      .catch(() => toast.error("Failed to load API keys"))
      .finally(() => setLoading(false));
  }, [orgSlug]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/settings/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const json: { data?: NewKeyResult; error?: string } = await res.json();
      if (res.ok && json.data) {
        setRevealedSecret(json.data.secret);
        setShowSecret(true);
        setKeys((k) => [{ ...json.data!, keyPrefix: json.data!.keyPrefix, lastUsedAt: null }, ...k]);
        setNewKeyName("");
        toast.success("API key created — copy it now, it won't be shown again.");
      } else {
        toast.error(json.error ?? "Failed to create key");
      }
    } catch {
      toast.error("Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    try {
      await fetch(`/api/orgs/${orgSlug}/settings/api-keys/${keyId}`, {
        method: "DELETE",
      });
      setKeys((k) => k.filter((key) => key.id !== keyId));
      toast.success("API key revoked");
    } catch {
      toast.error("Failed to revoke key");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">API Keys</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Create and manage API keys for integrating ZedImpact with external
        systems.
      </p>

      {/* New key secret reveal */}
      {revealedSecret && (
        <Card className="mb-6 max-w-2xl border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-2">
              New API key created — copy it now
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              This secret will never be shown again. Store it somewhere safe.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs font-mono text-foreground">
                {showSecret ? revealedSecret : "•".repeat(40)}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSecret((v) => !v)}
                aria-label={showSecret ? "Hide key" : "Show key"}
              >
                {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard.writeText(revealedSecret);
                  toast.success("Copied");
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-3 text-xs text-muted-foreground"
              onClick={() => setRevealedSecret(null)}
            >
              I&apos;ve saved it — dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      <Card className="mb-6 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="size-4" />
            Create new API key
          </CardTitle>
          <CardDescription>
            Give your key a descriptive name so you know what it&#39;s used for.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="keyName" className="sr-only">
                Key name
              </Label>
              <Input
                id="keyName"
                placeholder="e.g., Salesforce Integration"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                disabled={creating}
              />
            </div>
            <Button type="submit" disabled={creating || !newKeyName.trim()}>
              {creating && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create key
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Key list */}
      <div className="max-w-2xl space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : keys.length === 0 ? (
          <div className="rounded-xl border border-border border-dashed p-10 text-center">
            <Key className="mx-auto mb-3 size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No API keys yet. Create one above.
            </p>
          </div>
        ) : (
          keys.map((apiKey) => (
            <Card key={apiKey.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground text-sm">{apiKey.name}</p>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {apiKey.keyPrefix}...
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created{" "}
                    {new Date(apiKey.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    {apiKey.lastUsedAt && (
                      <>
                        {" "}· Last used{" "}
                        {new Date(apiKey.lastUsedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRevoke(apiKey.id)}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Revoke</span>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

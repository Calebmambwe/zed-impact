"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Globe, Plus, Trash2, CheckCircle, Clock, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

interface CustomDomain {
  id: string;
  domain: string;
  verified: boolean;
  verificationToken: string;
  createdAt: string;
}

export default function DomainsSettingsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";

  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/settings/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      const json: unknown = await res.json();
      if (res.ok && json !== null && typeof json === "object" && "data" in json) {
        const data = (json as { data: CustomDomain }).data;
        setDomains((d) => [...d, data]);
        setNewDomain("");
        toast.success("Domain added. Add the DNS TXT record to verify.");
      } else {
        const errMsg =
          json !== null && typeof json === "object" && "error" in json
            ? String((json as { error: unknown }).error)
            : "Failed to add domain";
        toast.error(errMsg);
      }
    } catch {
      toast.error("Failed to add domain");
    } finally {
      setAdding(false);
    }
  }

  async function handleVerify(domainId: string) {
    setVerifying(domainId);
    try {
      const res = await fetch(
        `/api/orgs/${orgSlug}/settings/domains/${domainId}/verify`,
        { method: "POST" }
      );
      const json: unknown = await res.json();
      if (res.ok) {
        setDomains((d) =>
          d.map((dom) => dom.id === domainId ? { ...dom, verified: true } : dom)
        );
        toast.success("Domain verified successfully!");
      } else {
        const errMsg =
          json !== null && typeof json === "object" && "error" in json
            ? String((json as { error: unknown }).error)
            : "Verification failed — DNS TXT record not found yet";
        toast.error(errMsg);
      }
    } catch {
      toast.error("Verification failed");
    } finally {
      setVerifying(null);
    }
  }

  async function handleDelete(domainId: string) {
    try {
      await fetch(`/api/orgs/${orgSlug}/settings/domains/${domainId}`, {
        method: "DELETE",
      });
      setDomains((d) => d.filter((dom) => dom.id !== domainId));
      toast.success("Domain removed");
    } catch {
      toast.error("Failed to remove domain");
    }
  }

  function copyToken(token: string) {
    void navigator.clipboard.writeText(token);
    toast.success("Copied to clipboard");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Custom Domains</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Serve your public donation and event pages from your own domain.
      </p>

      {/* Add domain */}
      <Card className="mb-6 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="size-4" />
            Add a custom domain
          </CardTitle>
          <CardDescription>
            Enter your domain (e.g., give.yourorg.org). You&#39;ll need to add a DNS
            TXT record to verify ownership.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="domain" className="sr-only">
                Domain
              </Label>
              <Input
                id="domain"
                placeholder="give.yourorg.org"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                disabled={adding}
              />
            </div>
            <Button type="submit" disabled={adding || !newDomain.trim()}>
              {adding && <Loader2 className="mr-2 size-4 animate-spin" />}
              Add domain
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Domain list */}
      <div className="max-w-2xl space-y-3">
        {domains.length === 0 ? (
          <div className="rounded-xl border border-border border-dashed p-10 text-center">
            <Globe className="mx-auto mb-3 size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No custom domains yet. Add one above.
            </p>
          </div>
        ) : (
          domains.map((domain) => (
            <Card key={domain.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground truncate">
                        {domain.domain}
                      </p>
                      {domain.verified ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0 text-xs">
                          <CheckCircle className="mr-1 size-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="mr-1 size-3" />
                          Pending
                        </Badge>
                      )}
                    </div>
                    {!domain.verified && (
                      <div className="mt-3 rounded-lg bg-muted p-3">
                        <p className="text-xs font-medium text-foreground mb-1">
                          DNS Verification Record
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Add this TXT record to your DNS provider:
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">Name</p>
                            <code className="text-xs font-mono text-foreground">
                              _zedimpact-verify.{domain.domain}
                            </code>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">Value</p>
                            <div className="flex items-center gap-1">
                              <code className="text-xs font-mono text-foreground truncate">
                                {domain.verificationToken}
                              </code>
                              <button
                                onClick={() => copyToken(domain.verificationToken)}
                                className="shrink-0 text-muted-foreground hover:text-foreground"
                              >
                                <Copy className="size-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!domain.verified && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerify(domain.id)}
                        disabled={verifying === domain.id}
                      >
                        {verifying === domain.id && (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        )}
                        Verify
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(domain.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

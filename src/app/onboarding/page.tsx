"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 64);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !email.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, email }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to create organization");
      router.push(`/${slug}/admin`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to ZedImpact</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Set up your organization to get started
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Organization name</Label>
              <Input
                id="orgName"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="My Nonprofit"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orgSlug">URL slug</Label>
              <Input
                id="orgSlug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="my-nonprofit"
                required
              />
              <p className="text-xs text-muted-foreground">
                Your dashboard will be at /{slug}/admin
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orgEmail">Contact email</Label>
              <Input
                id="orgEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nonprofit.org"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Creating..." : "Create organization"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";

interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
}

export default function AdminSettingsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";

  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!orgSlug) return;
    setLoading(true);
    fetch(`/api/public/orgs/${orgSlug}`)
      .then((r) => r.json())
      .then((json: { data?: OrgSettings }) => {
        setSettings(json.data ?? null);
      })
      .catch(() => setError("Failed to load settings"))
      .finally(() => setLoading(false));
  }, [orgSlug]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch(`/api/orgs/${settings.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settings.name,
          description: settings.description,
          website: settings.website,
          logoUrl: settings.logoUrl,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Manage your organization settings
      </p>

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Organization details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization name</Label>
              <Input
                id="name"
                value={settings?.name ?? ""}
                onChange={(e) =>
                  setSettings((s) => s ? { ...s, name: e.target.value } : s)
                }
                placeholder="Your Organization"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={settings?.slug ?? ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                The slug cannot be changed after creation
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={settings?.description ?? ""}
                onChange={(e) =>
                  setSettings((s) => s ? { ...s, description: e.target.value } : s)
                }
                placeholder="Brief description of your organization"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={settings?.website ?? ""}
                onChange={(e) =>
                  setSettings((s) => s ? { ...s, website: e.target.value } : s)
                }
                placeholder="https://yourorg.org"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                type="url"
                value={settings?.logoUrl ?? ""}
                onChange={(e) =>
                  setSettings((s) => s ? { ...s, logoUrl: e.target.value } : s)
                }
                placeholder="https://yourorg.org/logo.png"
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {saved ? "Saved!" : "Save changes"}
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

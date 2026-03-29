"use client";

import { useState } from "react";
import { Loader2, Bell, Mail, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface NotificationPrefs {
  emailMonthlyReceipt: boolean;
  emailChildUpdate: boolean;
  emailNewLetter: boolean;
  emailAnnualReport: boolean;
}

export default function SponsorSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    emailMonthlyReceipt: true,
    emailChildUpdate: true,
    emailNewLetter: true,
    emailAnnualReport: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof NotificationPrefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Simulate save — wire to actual API when available
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSaving(false);
    setSaved(true);
  }

  const notifications: Array<{
    key: keyof NotificationPrefs;
    label: string;
    description: string;
    icon: React.ElementType;
  }> = [
    {
      key: "emailMonthlyReceipt",
      label: "Monthly Payment Receipts",
      description: "Receive a receipt email after each monthly sponsorship payment",
      icon: Mail,
    },
    {
      key: "emailChildUpdate",
      label: "Child Updates",
      description: "Be notified when your sponsored child has a new update or milestone",
      icon: Bell,
    },
    {
      key: "emailNewLetter",
      label: "New Letters",
      description: "Get an email when your sponsored child sends you a letter",
      icon: MessageSquare,
    },
    {
      key: "emailAnnualReport",
      label: "Annual Impact Report",
      description: "Receive a yearly summary of your sponsorship impact",
      icon: Mail,
    },
  ];

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your notification preferences
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 divide-y">
            {notifications.map(({ key, label, description, icon: Icon }) => (
              <div
                key={key}
                className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted flex-shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <Label
                      htmlFor={key}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 mt-1">
                  <button
                    type="button"
                    id={key}
                    role="switch"
                    aria-checked={prefs[key]}
                    onClick={() => toggle(key)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      prefs[key] ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span className="sr-only">Toggle {label}</span>
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        prefs[key] ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Preferences"
            )}
          </Button>
          {saved && (
            <p className="text-xs text-green-700 font-medium">Preferences saved.</p>
          )}
        </div>
      </form>
    </div>
  );
}

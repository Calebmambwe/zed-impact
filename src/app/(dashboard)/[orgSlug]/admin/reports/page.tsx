"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2, Download, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";

const REPORT_TYPES = [
  {
    value: "IMPACT",
    label: "Impact Report",
    description: "Key achievements, beneficiaries, and community outcomes",
  },
  {
    value: "FINANCIAL",
    label: "Financial Summary",
    description: "Revenue streams, donation trends, and campaign performance",
  },
  {
    value: "SPONSORSHIP",
    label: "Sponsorship Report",
    description: "Active sponsorships, retention rate, and sponsor demographics",
  },
  {
    value: "ENGAGEMENT",
    label: "Donor Engagement",
    description: "Acquisition, retention rates, and communication metrics",
  },
] as const;

type ReportType = (typeof REPORT_TYPES)[number]["value"];

export default function ReportsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";

  const [selectedType, setSelectedType] = useState<ReportType>("IMPACT");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<EventSource | null>(null);

  async function resolveOrgId(): Promise<string | null> {
    if (orgId) return orgId;
    try {
      const res = await fetch(`/api/public/orgs/${orgSlug}`);
      const json = (await res.json()) as { data?: { id?: string } };
      const id = json.data?.id ?? null;
      if (id) setOrgId(id);
      return id;
    } catch {
      return null;
    }
  }

  async function generateReport() {
    setError(null);
    setReportContent("");

    const id = await resolveOrgId();
    if (!id) {
      setError("Could not resolve organization");
      return;
    }

    setIsGenerating(true);

    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: id, reportType: selectedType }),
      });

      if (!res.ok || !res.body) {
        setError("Failed to generate report");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as { content?: string };
            if (parsed.content) {
              setReportContent((prev) => prev + parsed.content);
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  function downloadReport() {
    const blob = new Blob([reportContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedType.toLowerCase()}-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Reports</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Generate AI-powered reports for your organization
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Report type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {REPORT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                    selectedType === type.value
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  <p className="font-medium">{type.label}</p>
                  <p className="text-xs mt-0.5 opacity-70">{type.description}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Button
            onClick={generateReport}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="border-b border-border pb-4 flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Report output</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI-generated report will appear here
                </p>
              </div>
              {reportContent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadReport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {!reportContent && !error && !isGenerating && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Select a report type and click Generate
                  </p>
                </div>
              )}
              {isGenerating && !reportContent && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating your report...
                </div>
              )}
              {reportContent && (
                <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed max-h-[60vh] overflow-y-auto">
                  {reportContent}
                  {isGenerating && (
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
                  )}
                </pre>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

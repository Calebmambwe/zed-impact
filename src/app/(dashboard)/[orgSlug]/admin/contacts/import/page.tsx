"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

interface ImportResponse {
  success: boolean;
  data: ImportResult | null;
  error: { code: string; message: string } | null;
}

interface CsvRow {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  type?: string;
  [key: string]: string | undefined;
}

async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"(.*)"$/, "$1"));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"(.*)"$/, "$1"));
    const row: CsvRow = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

export default function ContactsImportPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const orgId = await resolveOrgId(orgSlug);
      if (!orgId) {
        setError("Organization not found");
        return;
      }

      const text = await file.text();
      const rows = parseCsv(text);

      if (rows.length === 0) {
        setError("CSV file is empty or has no data rows");
        return;
      }

      const res = await fetch(`/api/orgs/${orgId}/contacts/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      });

      const json = await res.json() as ImportResponse;
      if (!json.success || !json.data) {
        setError(json.error?.message ?? "Import failed");
        return;
      }

      setResult(json.data);
    } catch {
      setError("Failed to import contacts");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${orgSlug}/admin/contacts`}>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Contacts
          </Button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold text-foreground">Import Contacts</h1>
      </div>

      <Card className="mb-4">
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            CSV Format
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground mb-3">
            Your CSV file must include the following columns. The first row must be a header row.
          </p>
          <div className="overflow-x-auto rounded-md border bg-muted/30 px-4 py-3">
            <code className="text-xs text-foreground font-mono">
              firstName, lastName, email, phone, type
            </code>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <span className="font-medium">type</span> must be one of: DONOR, VOLUNTEER, SPONSOR, STAFF, BOARD, OTHER
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload File
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Import complete
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-green-50 p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{result.created}</p>
                  <p className="text-xs text-green-600 font-medium mt-0.5">Created</p>
                </div>
                <div className="rounded-lg border bg-blue-50 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
                  <p className="text-xs text-blue-600 font-medium mt-0.5">Updated</p>
                </div>
                <div className="rounded-lg border bg-muted p-3 text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{result.skipped}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Skipped</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs font-semibold text-destructive mb-2">
                    {result.errors.length} row{result.errors.length !== 1 ? "s" : ""} had errors:
                  </p>
                  <ul className="space-y-1">
                    {result.errors.slice(0, 5).map((e, i) => (
                      <li key={i} className="text-xs text-destructive">
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                    {result.errors.length > 5 && (
                      <li className="text-xs text-muted-foreground">
                        …and {result.errors.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setResult(null);
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Import Another File
                </Button>
                <Button size="sm" onClick={() => router.push(`/${orgSlug}/admin/contacts`)}>
                  View Contacts
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="csv-file">CSV File</Label>
                <div
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-10 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                  onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Click to select CSV file"
                >
                  <Upload className="h-8 w-8 text-muted-foreground/50 mb-3" />
                  {file ? (
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-foreground">
                        Drop a CSV file here or{" "}
                        <span className="text-primary font-medium">browse</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">CSV files only</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="sr-only"
                  aria-label="Upload CSV file"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={!file || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import Contacts
                    </>
                  )}
                </Button>
                <Link href={`/${orgSlug}/admin/contacts`}>
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

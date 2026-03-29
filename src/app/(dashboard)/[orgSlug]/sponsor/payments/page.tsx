"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  createdAt: string;
  child: { firstName: string; lastName: string } | null;
}

interface PaymentsResponse {
  success: boolean;
  data: { payments: Payment[] } | null;
  error: { code: string; message: string } | null;
  meta?: { page: number; limit: number; total: number };
}

async function resolveOrgId(slug: string): Promise<string | null> {
  const res = await fetch(`/api/public/orgs/${slug}`);
  if (!res.ok) return null;
  const json = await res.json() as { success: boolean; data: { id: string } | null };
  return json.data?.id ?? null;
}

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    COMPLETED: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    FAILED: "bg-red-100 text-red-700",
    REFUNDED: "bg-blue-100 text-blue-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default function SponsorPaymentsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug ?? "";

  const [payments, setPayments] = useState<Payment[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const orgId = await resolveOrgId(orgSlug);
      if (!orgId) {
        setError("Organization not found");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/orgs/${orgId}/sponsor/payments?limit=20`);
        if (res.status === 404) {
          setPayments([]);
          setLoading(false);
          return;
        }
        const json = await res.json() as PaymentsResponse;
        if (json.success && json.data) {
          setPayments(json.data.payments);
          setMeta(json.meta ?? null);
        }
      } catch {
        setError("Failed to load payment history");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [orgSlug]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Payment History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          A record of all your sponsorship payments
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            All Payments
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
              Loading payments…
            </div>
          )}
          {!loading && error && (
            <div className="py-16 text-center text-sm text-destructive">{error}</div>
          )}
          {!loading && !error && payments.length === 0 && (
            <div className="py-16 text-center">
              <CreditCard className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No payments yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your payment history will appear here once you start sponsoring.
              </p>
            </div>
          )}
          {!loading && !error && payments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                      Child
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        {payment.child
                          ? `${payment.child.firstName} ${payment.child.lastName}`
                          : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                        {payment.description ?? <span className="text-muted-foreground/50">Monthly sponsorship</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="px-4 py-3">{statusBadge(payment.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

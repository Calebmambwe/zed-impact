/**
 * GET /api/admin/health
 * Returns system health status: DB, Stripe, Resend.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser, requireOrgRole, errorResponse } from "@/lib/org-auth";

interface HealthCheck {
  name: string;
  status: "ok" | "degraded" | "error";
  latencyMs?: number;
  message?: string;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { name: "Database", status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      name: "Database",
      status: "error",
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkStripe(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { name: "Stripe", status: "degraded", message: "STRIPE_SECRET_KEY not configured" };
    }
    // Light API call — just verify the key works
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    });
    if (!res.ok) {
      return {
        name: "Stripe",
        status: "degraded",
        latencyMs: Date.now() - start,
        message: `HTTP ${res.status}`,
      };
    }
    return { name: "Stripe", status: "ok", latencyMs: Date.now() - start };
  } catch {
    return { name: "Stripe", status: "error", latencyMs: Date.now() - start, message: "Unreachable" };
  }
}

async function checkResend(): Promise<HealthCheck> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { name: "Resend", status: "degraded", message: "RESEND_API_KEY not configured" };
    }
    return { name: "Resend", status: "ok" };
  } catch {
    return { name: "Resend", status: "error", message: "Configuration error" };
  }
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) {
      return NextResponse.json(
        { success: false, data: null, error: "orgId required" },
        { status: 400 }
      );
    }

    await requireOrgRole(user.id, orgId, "ADMIN", "MANAGER");

    const checks = await Promise.all([checkDatabase(), checkStripe(), checkResend()]);

    const overallStatus = checks.some((c) => c.status === "error")
      ? "error"
      : checks.some((c) => c.status === "degraded")
      ? "degraded"
      : "ok";

    return NextResponse.json({
      success: true,
      data: { status: overallStatus, checks, checkedAt: new Date().toISOString() },
      error: null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

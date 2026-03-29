/**
 * GET /api/orgs/[orgId]/stats
 * Returns aggregate stats for the admin dashboard KPI cards and charts.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
} from "@/lib/org-auth";
import { withOrgContext } from "@/lib/org-context";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId } = await params;

    await requireOrgRole(user.id, orgId, "STAFF");

    const [totalRaisedResult, donationCount, activeDonors, campaignCount, recentDonations] =
      await Promise.all([
        withOrgContext(orgId, () =>
          prisma.donation.aggregate({
            _sum: { amount: true },
            where: { organizationId: orgId, status: "COMPLETED" },
          })
        ),
        withOrgContext(orgId, () =>
          prisma.donation.count({
            where: { organizationId: orgId, status: "COMPLETED" },
          })
        ),
        withOrgContext(orgId, () =>
          prisma.donation.groupBy({
            by: ["donorEmail"],
            where: {
              organizationId: orgId,
              status: "COMPLETED",
              donorEmail: { gt: "" },
            },
          }).then((r) => r.length)
        ),
        withOrgContext(orgId, () =>
          prisma.campaign.count({
            where: { organizationId: orgId, status: "ACTIVE" },
          })
        ),
        withOrgContext(orgId, () =>
          prisma.donation.findMany({
            where: { organizationId: orgId, status: "COMPLETED" },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              amount: true,
              currency: true,
              donorName: true,
              createdAt: true,
            },
          })
        ),
      ]);

    // Build monthly data for the last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const monthlyRaw = await withOrgContext(orgId, () =>
      prisma.donation.findMany({
        where: {
          organizationId: orgId,
          status: "COMPLETED",
          createdAt: { gte: sixMonthsAgo },
        },
        select: { amount: true, createdAt: true },
      })
    );

    // Group by month
    const monthlyMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString("en-US", { month: "short" });
      monthlyMap.set(key, 0);
    }
    for (const d of monthlyRaw) {
      const key = d.createdAt.toLocaleString("en-US", { month: "short" });
      if (monthlyMap.has(key)) {
        monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + d.amount);
      }
    }
    const monthlyData = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
      month,
      amount,
    }));

    // Payment methods breakdown
    const paymentMethodRaw = await withOrgContext(orgId, () =>
      prisma.donation.groupBy({
        by: ["paymentMethod"],
        where: { organizationId: orgId, status: "COMPLETED" },
        _count: { id: true },
      })
    );

    const COLOR_MAP: Record<string, string> = {
      CARD: "#22c55e",
      MOBILE_MONEY: "#3b82f6",
      BANK_TRANSFER: "#f59e0b",
      CASH: "#8b5cf6",
      CHECK: "#ec4899",
    };

    const paymentMethodData = paymentMethodRaw.map((r) => ({
      name:
        r.paymentMethod === "MOBILE_MONEY"
          ? "Mobile Money"
          : r.paymentMethod === "CARD"
          ? "Card"
          : r.paymentMethod === "BANK_TRANSFER"
          ? "Bank Transfer"
          : r.paymentMethod ?? "Other",
      value: r._count.id,
      color: COLOR_MAP[r.paymentMethod ?? ""] ?? "#6b7280",
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalRaised: totalRaisedResult._sum.amount ?? 0,
        donationCount,
        activeDonors,
        campaignCount,
        monthlyData,
        paymentMethodData,
        recentDonations: recentDonations.map((d) => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
        })),
      },
      error: null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

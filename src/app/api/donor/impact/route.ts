/**
 * GET /api/donor/impact
 * Returns donor's impact summary: total given, children sponsored, campaigns supported.
 */
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { success: false, data: null, error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json(
        { success: false, data: null, error: "User not found" },
        { status: 404 }
      );
    }

    const [totalGivenResult, donationCount, activeSponsorships] = await Promise.all([
      prisma.donation.aggregate({
        _sum: { amount: true },
        where: { donorEmail: user.email, status: "COMPLETED" },
      }),
      prisma.donation.count({
        where: { donorEmail: user.email, status: "COMPLETED" },
      }),
      prisma.sponsorship.count({
        where: { userId: user.id, status: "ACTIVE" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalGiven: totalGivenResult._sum.amount ?? 0,
        donationCount,
        activeSponsorships,
      },
      error: null,
    });
  } catch (err) {
    console.error("[donor/impact] error:", err);
    return NextResponse.json(
      { success: false, data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}

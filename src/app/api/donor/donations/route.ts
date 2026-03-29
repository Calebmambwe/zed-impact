/**
 * GET /api/donor/donations
 * Returns the authenticated donor's own donation history.
 */
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
    const skip = (page - 1) * limit;

    const [donations, total] = await Promise.all([
      prisma.donation.findMany({
        where: { donorEmail: user.email, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          type: true,
          paymentMethod: true,
          createdAt: true,
          donorName: true,
          isAnonymous: true,
          campaign: { select: { name: true } },
        },
      }),
      prisma.donation.count({
        where: { donorEmail: user.email, status: "COMPLETED" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: donations.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })),
      error: null,
      meta: { page, limit, total },
    });
  } catch (err) {
    console.error("[donor/donations] error:", err);
    return NextResponse.json(
      { success: false, data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { AuthorizationError, AuthenticationError } from "@/lib/auth";
import { errorResponse } from "@/lib/org-auth";

/**
 * GET /api/platform/orgs
 * List all organizations. Super-admin only.
 * Supports pagination via ?page= and ?limit= query params.
 */
export async function GET(req: Request) {
  try {
    await requireRole("SUPER_ADMIN");

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10))
    );
    const skip = (page - 1) * limit;

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          slug: true,
          name: true,
          planTier: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.organization.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: orgs,
      error: null,
      meta: { page, limit, total },
    });
  } catch (error) {
    if (
      error instanceof AuthorizationError ||
      error instanceof AuthenticationError
    ) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "FORBIDDEN", message: error.message },
        },
        { status: error instanceof AuthenticationError ? 401 : 403 }
      );
    }
    return errorResponse(error);
  }
}

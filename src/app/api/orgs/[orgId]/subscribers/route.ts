import { NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
} from "@/lib/org-auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/orgs/[orgId]/subscribers
 * Lists newsletter subscribers for the org. Requires STAFF or higher role.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId } = await params;
    await requireOrgRole(user.id, orgId, "STAFF");

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const skip = (page - 1) * limit;

    const [subscribers, total] = await Promise.all([
      prisma.subscriber.findMany({
        where: { organizationId: orgId },
        orderBy: { subscribedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.subscriber.count({ where: { organizationId: orgId } }),
    ]);

    return NextResponse.json({
      success: true,
      data: { subscribers },
      error: null,
      meta: { page, limit, total },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

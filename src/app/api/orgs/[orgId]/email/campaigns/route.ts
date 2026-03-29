import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
} from "@/lib/org-auth";
import { prisma } from "@/lib/db";
import { createEmailCampaignSchema } from "@/lib/validations/email";

/**
 * GET /api/orgs/[orgId]/email/campaigns
 * Lists all email campaigns for the org. Requires STAFF or higher role.
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
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      prisma.emailCampaign.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          segment: { select: { id: true, name: true } },
        },
      }),
      prisma.emailCampaign.count({ where: { organizationId: orgId } }),
    ]);

    return NextResponse.json({
      success: true,
      data: { campaigns },
      error: null,
      meta: { page, limit, total },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/orgs/[orgId]/email/campaigns
 * Creates a new email campaign draft. Requires STAFF or higher role.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId } = await params;
    await requireOrgRole(user.id, orgId, "STAFF");

    const body: unknown = await req.json();
    const data = createEmailCampaignSchema.parse(body);

    const campaign = await prisma.emailCampaign.create({
      data: {
        organizationId: orgId,
        name: data.name,
        subject: data.subject,
        previewText: data.previewText ?? null,
        blocks: data.blocks,
        segmentId: data.segmentId ?? null,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      },
    });

    return NextResponse.json({ success: true, data: campaign, error: null }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Invalid campaign data", details: error.issues },
        },
        { status: 422 }
      );
    }
    return errorResponse(error);
  }
}

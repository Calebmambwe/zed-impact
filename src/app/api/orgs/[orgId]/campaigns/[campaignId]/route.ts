import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
  NotFoundError,
} from "@/lib/org-auth";
import {
  getCampaignById,
  updateCampaign,
  deleteCampaign,
} from "@/lib/services/campaign-mt.service";
import { campaignUpdateSchema } from "@/lib/validations/donation";

/**
 * GET /api/orgs/[orgId]/campaigns/[campaignId]
 * Returns a single campaign with donation count.
 * Requires STAFF or higher role.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; campaignId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId, campaignId } = await params;
    await requireOrgRole(user.id, orgId, "STAFF");

    const campaign = await getCampaignById(orgId, campaignId);
    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    return NextResponse.json({ success: true, data: campaign, error: null });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * PATCH /api/orgs/[orgId]/campaigns/[campaignId]
 * Partially updates a campaign.
 * Requires MANAGER or higher role.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string; campaignId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId, campaignId } = await params;
    await requireOrgRole(user.id, orgId, "MANAGER");

    const body: unknown = await req.json();
    const input = campaignUpdateSchema.parse(body);

    const campaign = await getCampaignById(orgId, campaignId);
    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    const updated = await updateCampaign(orgId, campaignId, input);

    return NextResponse.json({ success: true, data: updated, error: null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Invalid input", details: error.issues },
        },
        { status: 422 }
      );
    }
    if (error instanceof Error && error.message.includes("slug")) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "CONFLICT", message: error.message },
        },
        { status: 409 }
      );
    }
    return errorResponse(error);
  }
}

/**
 * DELETE /api/orgs/[orgId]/campaigns/[campaignId]
 * Deletes or archives a campaign.
 * Requires MANAGER or higher role.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; campaignId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId, campaignId } = await params;
    await requireOrgRole(user.id, orgId, "MANAGER");

    const campaign = await getCampaignById(orgId, campaignId);
    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    await deleteCampaign(orgId, campaignId);

    return NextResponse.json({ success: true, data: null, error: null });
  } catch (error) {
    return errorResponse(error);
  }
}

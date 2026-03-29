import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
} from "@/lib/org-auth";
import {
  listCampaigns,
  createCampaign,
} from "@/lib/services/campaign-mt.service";
import { campaignSchema, campaignListQuerySchema } from "@/lib/validations/donation";

/**
 * GET /api/orgs/[orgId]/campaigns
 * Returns a paginated list of campaigns for the org.
 * Requires STAFF or higher role.
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
    const query = campaignListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    const result = await listCampaigns(orgId, query);

    return NextResponse.json({
      success: true,
      data: result.campaigns,
      error: null,
      meta: result.meta,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Invalid query params", details: error.issues },
        },
        { status: 422 }
      );
    }
    return errorResponse(error);
  }
}

/**
 * POST /api/orgs/[orgId]/campaigns
 * Creates a new campaign.
 * Requires MANAGER or higher role.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId } = await params;
    await requireOrgRole(user.id, orgId, "MANAGER");

    const body: unknown = await req.json();
    const input = campaignSchema.parse(body);

    const campaign = await createCampaign(orgId, input);

    return NextResponse.json(
      { success: true, data: campaign, error: null },
      { status: 201 }
    );
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

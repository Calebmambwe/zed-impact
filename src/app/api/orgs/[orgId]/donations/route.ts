import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
} from "@/lib/org-auth";
import {
  listDonations,
  createDonationRecord,
  getDonationStats,
} from "@/lib/services/donation-mt.service";
import {
  donationRecordSchema,
  donationListQuerySchema,
} from "@/lib/validations/donation";

/**
 * GET /api/orgs/[orgId]/donations
 * Returns paginated donations list with stats for the org.
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
    const query = donationListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      campaignId: searchParams.get("campaignId") ?? undefined,
    });

    const [result, stats] = await Promise.all([
      listDonations(orgId, query),
      getDonationStats(orgId),
    ]);

    return NextResponse.json({
      success: true,
      data: { donations: result.donations, stats },
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
 * POST /api/orgs/[orgId]/donations
 * Manually records an offline donation (cash, check, etc.).
 * Requires STAFF or higher role.
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
    const input = donationRecordSchema.parse(body);

    const donation = await createDonationRecord(orgId, {
      donorName: input.donorName,
      donorEmail: input.donorEmail,
      amount: input.amount,
      currency: input.currency,
      paymentMethod: input.paymentMethod as Parameters<typeof createDonationRecord>[1]["paymentMethod"],
      campaignId: input.campaignId,
      notes: input.notes,
      donationDate: input.donationDate,
      isAnonymous: input.isAnonymous,
    });

    return NextResponse.json(
      { success: true, data: donation, error: null },
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
    return errorResponse(error);
  }
}

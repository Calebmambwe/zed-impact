import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
} from "@/lib/org-auth";
import {
  listMembershipTiers,
  createMembershipTier,
} from "@/lib/services/membership.service";
import {
  createMembershipTierSchema,
  membershipListQuerySchema,
} from "@/lib/validations/memberships";

/**
 * GET /api/orgs/[orgId]/memberships
 * Returns a paginated list of membership tiers for the org.
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
    const query = membershipListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const result = await listMembershipTiers(orgId, query);

    return NextResponse.json({
      success: true,
      data: result.tiers,
      error: null,
      meta: result.meta,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query params",
            details: error.issues,
          },
        },
        { status: 422 }
      );
    }
    return errorResponse(error);
  }
}

/**
 * POST /api/orgs/[orgId]/memberships
 * Creates a new membership tier.
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
    const data = createMembershipTierSchema.parse(body);
    const tier = await createMembershipTier(orgId, data);

    return NextResponse.json(
      { success: true, data: tier, error: null },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid membership tier data",
            details: error.issues,
          },
        },
        { status: 422 }
      );
    }
    return errorResponse(error);
  }
}

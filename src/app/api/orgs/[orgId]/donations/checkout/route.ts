import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
} from "@/lib/org-auth";
import { createCheckoutSession } from "@/lib/services/donation.service";
import { checkoutSchema } from "@/lib/validations/donation";

/**
 * POST /api/orgs/[orgId]/donations/checkout
 * Creates a Stripe checkout session for a donation.
 * Requires STAFF or higher role (admin-initiated donations).
 * Returns 202 with checkoutUrl to redirect the donor to Stripe.
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
    const input = checkoutSchema.parse(body);

    const result = await createCheckoutSession(orgId, input);

    return NextResponse.json(
      { success: true, data: result, error: null },
      { status: 202 }
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

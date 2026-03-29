import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createCheckoutSession } from "@/lib/services/donation.service";
import { checkoutSchema } from "@/lib/validations/donation";

/**
 * POST /api/public/orgs/[slug]/donate
 * Public endpoint — no authentication required.
 * Creates a Stripe checkout session for a donor-initiated donation.
 * Returns 202 Accepted with a checkoutUrl to redirect the donor.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const org = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });

    if (!org) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "NOT_FOUND", message: "Organization not found" },
        },
        { status: 404 }
      );
    }

    const body: unknown = await req.json();
    const input = checkoutSchema.parse(body);

    const result = await createCheckoutSession(org.id, input);

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
    console.error("[ZedImpact] Public donate error:", error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}

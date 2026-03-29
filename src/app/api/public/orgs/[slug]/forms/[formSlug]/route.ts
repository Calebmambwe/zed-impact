import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFormBySlug } from "@/lib/services/donation-form.service";

/**
 * GET /api/public/orgs/[slug]/forms/[formSlug]
 * Public endpoint — no authentication required.
 * Returns a single published donation form by slug.
 * Only returns published forms (requirePublished = true).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; formSlug: string }> }
) {
  try {
    const { slug, formSlug } = await params;

    const org = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
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

    const form = await getFormBySlug(org.id, formSlug, true);

    if (!form) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "NOT_FOUND", message: "Donation form not found" },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: form, error: null });
  } catch (error) {
    console.error("[ZedImpact] Public form fetch error:", error);
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

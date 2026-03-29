import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listForms } from "@/lib/services/donation-form.service";

/**
 * GET /api/public/orgs/[slug]/forms
 * Public endpoint — no authentication required.
 * Returns all published donation forms for the org.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

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

    // listForms returns all forms; filter to published only for public view
    const allForms = await listForms(org.id);
    const publishedForms = allForms.filter((f) => f.isPublished);

    return NextResponse.json({ success: true, data: publishedForms, error: null });
  } catch (error) {
    console.error("[ZedImpact] Public forms list error:", error);
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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listProducts } from "@/lib/services/store.service";

/**
 * GET /api/public/orgs/[slug]/store
 * Public endpoint — no authentication required.
 * Returns all published products for the org.
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

    const result = await listProducts(org.id, { isPublished: true });

    return NextResponse.json({
      success: true,
      data: result.products,
      error: null,
      meta: result.meta,
    });
  } catch (error) {
    console.error("[ZedImpact] Public store list error:", error);
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

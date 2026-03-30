import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/public/orgs/[slug]
 * Public org info — no authentication required.
 * Used by client pages (donate, events, campaigns) to resolve org by slug.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const org = await prisma.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        logoUrl: true,
        website: true,
        planTier: true,
      },
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

    return NextResponse.json({ success: true, data: org, error: null });
  } catch (err) {
    console.error("[/api/public/orgs] DB error:", err);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: "INTERNAL_ERROR", message: "Failed to load organization" },
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listEvents } from "@/lib/services/event.service";

/**
 * GET /api/public/orgs/[slug]/events
 * Public endpoint — no authentication required.
 * Returns all published upcoming events for the org.
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

    const result = await listEvents(org.id, { isPublished: true });

    return NextResponse.json({
      success: true,
      data: result.events,
      error: null,
      meta: result.meta,
    });
  } catch (error) {
    console.error("[ZedImpact] Public events list error:", error);
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

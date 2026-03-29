import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
} from "@/lib/org-auth";
import { prisma } from "@/lib/db";
import { createSegmentSchema } from "@/lib/validations/contact";

/**
 * GET /api/orgs/[orgId]/contacts/segments
 * Lists all segments for the org. Requires STAFF or higher role.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId } = await params;
    await requireOrgRole(user.id, orgId, "STAFF");

    const segments = await prisma.segment.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: { segments }, error: null });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/orgs/[orgId]/contacts/segments
 * Creates a new segment. Requires STAFF or higher role.
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
    const data = createSegmentSchema.parse(body);

    const segment = await prisma.segment.create({
      data: {
        organizationId: orgId,
        name: data.name,
        description: data.description ?? null,
        filters: data.filters,
      },
    });

    return NextResponse.json({ success: true, data: segment, error: null }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Invalid segment data", details: error.issues },
        },
        { status: 422 }
      );
    }
    return errorResponse(error);
  }
}

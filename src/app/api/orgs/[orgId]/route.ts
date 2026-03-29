import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
  NotFoundError,
} from "@/lib/org-auth";

const updateOrgSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
});

/**
 * GET /api/orgs/[orgId]
 * Fetch a single organization. Requires membership.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId } = await params;

    await requireOrgRole(user.id, orgId, "VIEWER");

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        logoUrl: true,
        website: true,
        planTier: true,
        clerkOrgId: true,
        customDomain: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { members: true } },
      },
    });

    if (!org) {
      throw new NotFoundError("Organization not found");
    }

    return NextResponse.json({ success: true, data: org, error: null });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * PATCH /api/orgs/[orgId]
 * Update org fields. Requires ADMIN or higher.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId } = await params;

    await requireOrgRole(user.id, orgId, "ADMIN");

    const body: unknown = await req.json();
    const input = updateOrgSchema.parse(body);

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
        ...(input.website !== undefined && { website: input.website || null }),
      },
    });

    return NextResponse.json({ success: true, data: org, error: null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: error.issues,
          },
        },
        { status: 422 }
      );
    }
    return errorResponse(error);
  }
}

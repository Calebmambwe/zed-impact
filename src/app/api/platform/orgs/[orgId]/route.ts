import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, AuthorizationError, AuthenticationError } from "@/lib/auth";
import { errorResponse, NotFoundError } from "@/lib/org-auth";

const patchOrgSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  planTier: z.enum(["FREE", "PRO", "ENTERPRISE"]).optional(),
  description: z.string().max(500).optional().nullable(),
});

/**
 * GET /api/platform/orgs/[orgId]
 * Fetch a single org with member count. Super-admin only.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    await requireRole("SUPER_ADMIN");
    const { orgId } = await params;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { members: true } },
      },
    });

    if (!org) {
      throw new NotFoundError("Organization not found");
    }

    return NextResponse.json({ success: true, data: org, error: null });
  } catch (error) {
    if (
      error instanceof AuthorizationError ||
      error instanceof AuthenticationError
    ) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "FORBIDDEN", message: error.message },
        },
        { status: error instanceof AuthenticationError ? 401 : 403 }
      );
    }
    return errorResponse(error);
  }
}

/**
 * PATCH /api/platform/orgs/[orgId]
 * Update org name, plan tier, or description. Super-admin only.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    await requireRole("SUPER_ADMIN");
    const { orgId } = await params;

    const body: unknown = await req.json();
    const input = patchOrgSchema.parse(body);

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.planTier !== undefined && { planTier: input.planTier }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
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
    if (
      error instanceof AuthorizationError ||
      error instanceof AuthenticationError
    ) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "FORBIDDEN", message: error.message },
        },
        { status: error instanceof AuthenticationError ? 401 : 403 }
      );
    }
    return errorResponse(error);
  }
}

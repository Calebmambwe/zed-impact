import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
} from "@/lib/org-auth";

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["OWNER", "ADMIN", "MANAGER", "STAFF", "VIEWER"]).default("STAFF"),
});

/**
 * GET /api/orgs/[orgId]/members
 * List all members of an organization.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId } = await params;

    await requireOrgRole(user.id, orgId, "VIEWER");

    const members = await prisma.orgMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: members,
      error: null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/orgs/[orgId]/members
 * Add a member to an organization. Requires ADMIN role.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId } = await params;

    await requireOrgRole(user.id, orgId, "ADMIN");

    const body: unknown = await req.json();
    const input = addMemberSchema.parse(body);

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });
    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "NOT_FOUND", message: "User not found" },
        },
        { status: 404 }
      );
    }

    // Check for existing membership
    const existingMember = await prisma.orgMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: input.userId,
        },
      },
    });
    if (existingMember) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: "CONFLICT",
            message: "User is already a member of this organization",
          },
        },
        { status: 409 }
      );
    }

    const member = await prisma.orgMember.create({
      data: {
        organizationId: orgId,
        userId: input.userId,
        role: input.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: member, error: null },
      { status: 201 }
    );
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

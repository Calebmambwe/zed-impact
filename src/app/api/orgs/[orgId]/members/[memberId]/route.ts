import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
  NotFoundError,
  ForbiddenError,
} from "@/lib/org-auth";

const updateMemberSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MANAGER", "STAFF", "VIEWER"]),
});

/**
 * PATCH /api/orgs/[orgId]/members/[memberId]
 * Change a member's role. Requires ADMIN; OWNER role can only be granted by existing OWNER.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId, memberId } = await params;

    const actingMember = await requireOrgRole(user.id, orgId, "ADMIN");

    const targetMember = await prisma.orgMember.findUnique({
      where: { id: memberId },
      select: { id: true, userId: true, role: true, organizationId: true },
    });

    if (!targetMember || targetMember.organizationId !== orgId) {
      throw new NotFoundError("Member not found");
    }

    const body: unknown = await req.json();
    const input = updateMemberSchema.parse(body);

    // Only an OWNER can grant or revoke the OWNER role
    if (
      (input.role === "OWNER" || targetMember.role === "OWNER") &&
      actingMember.role !== "OWNER"
    ) {
      throw new ForbiddenError(
        "Only an OWNER can assign or remove the OWNER role"
      );
    }

    const updated = await prisma.orgMember.update({
      where: { id: memberId },
      data: { role: input.role },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: updated, error: null });
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

/**
 * DELETE /api/orgs/[orgId]/members/[memberId]
 * Remove a member from an organization. Requires ADMIN.
 * An OWNER cannot be removed unless they transfer ownership first.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId, memberId } = await params;

    const actingMember = await requireOrgRole(user.id, orgId, "ADMIN");

    const targetMember = await prisma.orgMember.findUnique({
      where: { id: memberId },
      select: { id: true, userId: true, role: true, organizationId: true },
    });

    if (!targetMember || targetMember.organizationId !== orgId) {
      throw new NotFoundError("Member not found");
    }

    // Prevent removing an OWNER unless acting user is also OWNER
    if (targetMember.role === "OWNER" && actingMember.role !== "OWNER") {
      throw new ForbiddenError("Only an OWNER can remove another OWNER");
    }

    // Prevent an org from having zero owners
    if (targetMember.role === "OWNER") {
      const ownerCount = await prisma.orgMember.count({
        where: { organizationId: orgId, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: "CONFLICT",
              message:
                "Cannot remove the last owner. Transfer ownership first.",
            },
          },
          { status: 409 }
        );
      }
    }

    await prisma.orgMember.delete({ where: { id: memberId } });

    return NextResponse.json({ success: true, data: null, error: null });
  } catch (error) {
    return errorResponse(error);
  }
}

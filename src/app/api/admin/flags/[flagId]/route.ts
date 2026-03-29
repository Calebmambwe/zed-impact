/**
 * PATCH /api/admin/flags/[flagId]  — toggle or update a feature flag
 * DELETE /api/admin/flags/[flagId] — delete a feature flag
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
  NotFoundError,
} from "@/lib/org-auth";

const patchFlagSchema = z.object({
  orgId: z.string().min(1),
  enabled: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ flagId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { flagId } = await params;
    const body: unknown = await req.json();
    const parsed = patchFlagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    const { orgId, ...updates } = parsed.data;
    await requireOrgRole(user.id, orgId, "ADMIN", "MANAGER");

    const existing = await prisma.featureFlag.findUnique({
      where: { id: flagId },
    });
    if (!existing || existing.organizationId !== orgId) {
      throw new NotFoundError("Feature flag not found");
    }

    const updated = await prisma.featureFlag.update({
      where: { id: flagId },
      data: updates,
    });

    return NextResponse.json({ success: true, data: updated, error: null });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ flagId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { flagId } = await params;
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) {
      return NextResponse.json(
        { success: false, data: null, error: "orgId required" },
        { status: 400 }
      );
    }

    await requireOrgRole(user.id, orgId, "ADMIN");

    const existing = await prisma.featureFlag.findUnique({
      where: { id: flagId },
    });
    if (!existing || existing.organizationId !== orgId) {
      throw new NotFoundError("Feature flag not found");
    }

    await prisma.featureFlag.delete({ where: { id: flagId } });

    return NextResponse.json({ success: true, data: null, error: null });
  } catch (err) {
    return errorResponse(err);
  }
}

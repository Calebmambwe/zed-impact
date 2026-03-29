/**
 * GET  /api/admin/flags  — list all feature flags for an org
 * POST /api/admin/flags  — create a new feature flag
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
} from "@/lib/org-auth";
import { withOrgContext } from "@/lib/org-context";

const createFlagSchema = z.object({
  orgId: z.string().min(1),
  name: z.string().min(1).max(100),
  enabled: z.boolean().optional().default(false),
});

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) {
      return NextResponse.json(
        { success: false, data: null, error: "orgId required" },
        { status: 400 }
      );
    }

    await requireOrgRole(user.id, orgId, "ADMIN", "MANAGER");

    const flags = await withOrgContext(orgId, () =>
      prisma.featureFlag.findMany({
        where: { organizationId: orgId },
        orderBy: { name: "asc" },
      })
    );

    return NextResponse.json({ success: true, data: flags, error: null });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const body: unknown = await req.json();
    const parsed = createFlagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    const { orgId, name, enabled } = parsed.data;
    await requireOrgRole(user.id, orgId, "ADMIN");

    const flag = await withOrgContext(orgId, () =>
      prisma.featureFlag.create({
        data: { organizationId: orgId, name, enabled },
      })
    );

    return NextResponse.json({ success: true, data: flag, error: null }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

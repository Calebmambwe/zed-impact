import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser, errorResponse } from "@/lib/org-auth";

const createOrgSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must be lowercase alphanumeric with hyphens only"
    ),
  description: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal("")),
});

/**
 * GET /api/orgs
 * List organizations the authenticated user is a member of.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    const memberships = await prisma.orgMember.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            logoUrl: true,
            planTier: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const orgs = memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      joinedAt: m.createdAt,
    }));

    return NextResponse.json({ success: true, data: orgs, error: null });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/orgs
 * Create a new organization; the authenticated user becomes OWNER.
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();

    const body: unknown = await req.json();
    const input = createOrgSchema.parse(body);

    const existing = await prisma.organization.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "CONFLICT", message: "Slug is already taken" },
        },
        { status: 409 }
      );
    }

    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          website: input.website || null,
        },
      });

      await tx.orgMember.create({
        data: {
          userId: user.id,
          organizationId: created.id,
          role: "OWNER",
        },
      });

      return created;
    });

    return NextResponse.json(
      { success: true, data: org, error: null },
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

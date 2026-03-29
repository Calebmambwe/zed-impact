/**
 * Organization-scoped authentication utilities for ZedImpact.
 * Provides role-based access control at the org-membership level,
 * distinct from the platform-level Role in auth.ts.
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { OrgRole } from "@prisma/client";
import { prisma } from "./db";

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to access this resource") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Numeric hierarchy for OrgRole values.
 * Higher number = higher privilege. Used to allow elevated roles to satisfy
 * lower-role requirements (e.g. OWNER satisfies STAFF check).
 */
const ROLE_HIERARCHY: Record<OrgRole, number> = {
  OWNER: 90,
  ADMIN: 80,
  MANAGER: 70,
  STAFF: 60,
  VIEWER: 10,
};

/**
 * Verifies the user is a member of the given org and satisfies at least one
 * of the required roles (by hierarchy). Throws ForbiddenError otherwise.
 *
 * @param userId - Internal database user ID
 * @param orgId - Organization ID
 * @param requiredRoles - Roles that are permitted; empty = any member role allowed
 * @returns The OrgMember record
 */
export async function requireOrgRole(
  userId: string,
  orgId: string,
  ...requiredRoles: OrgRole[]
) {
  const member = await prisma.orgMember.findUnique({
    where: {
      organizationId_userId: { organizationId: orgId, userId },
    },
  });

  if (!member) {
    throw new ForbiddenError("Not a member of this organization");
  }

  if (requiredRoles.length > 0) {
    // Exact role match OR member is higher in the hierarchy
    const memberLevel = ROLE_HIERARCHY[member.role];
    const minRequired = Math.min(
      ...requiredRoles.map((r) => ROLE_HIERARCHY[r])
    );
    if (memberLevel < minRequired) {
      throw new ForbiddenError(
        `Required role: ${requiredRoles.join(" or ")}. Current: ${member.role}`
      );
    }
  }

  return member;
}

/**
 * Returns the authenticated database user.
 * In SKIP_AUTH=true mode, returns the first ADMIN user from the database (dev only).
 */
export async function getAuthenticatedUser() {
  // DEV MODE: bypass Clerk when SKIP_AUTH=true
  if (process.env.SKIP_AUTH === "true") {
    const devUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });
    if (devUser) return devUser;
    // Fallback mock — only reached if DB is empty
    return {
      id: "user-demo",
      clerkId: "dev_user_1",
      email: "admin@demo.zedimpact.app",
      name: "Demo Admin",
      role: "ADMIN" as const,
      avatarUrl: null,
      stripeCustomerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const { userId } = await auth();
  if (!userId) {
    throw new UnauthorizedError();
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    throw new UnauthorizedError("User not found in database");
  }

  return user;
}

/**
 * Resolves orgId from route params (handles Next.js 16 async params).
 * Throws NotFoundError if the org does not exist.
 */
export async function getOrgFromParams(
  params: Promise<{ orgId: string }> | { orgId: string }
) {
  const { orgId } = await params;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });
  if (!org) {
    throw new NotFoundError("Organization not found");
  }
  return org;
}

/**
 * Maps domain error classes to HTTP JSON responses with the standard envelope.
 * Use at the top of every API route catch block.
 */
export function errorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "UNAUTHORIZED", message: error.message } },
      { status: 401 }
    );
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "FORBIDDEN", message: error.message } },
      { status: 403 }
    );
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "NOT_FOUND", message: error.message } },
      { status: 404 }
    );
  }
  console.error("[ZedImpact] Unhandled API error:", error);
  return NextResponse.json(
    { success: false, data: null, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    { status: 500 }
  );
}

/**
 * Authentication utilities for ZedImpact.
 * Wraps Clerk auth() with database user lookup and role-based access control.
 */
import { auth } from "@clerk/nextjs/server";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

export class AuthenticationError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Explicit allowlist: which Role values each Role can satisfy.
 * Higher roles implicitly satisfy lower roles except for SUPER_ADMIN,
 * which is a platform-level role with full access.
 */
const ROLE_PERMISSIONS: Record<Role, Set<Role>> = {
  USER: new Set<Role>(["USER"]),
  ADMIN: new Set<Role>(["USER", "ADMIN"]),
  SUPER_ADMIN: new Set<Role>(["USER", "ADMIN", "SUPER_ADMIN"]),
};

/**
 * Returns the current database user from Clerk session, or null if not signed in.
 */
export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  return user;
}

/**
 * Returns the current user or throws AuthenticationError if not signed in.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationError("Authentication required");
  }
  return user;
}

/**
 * Asserts the current user holds at least one of the specified platform roles.
 * Throws AuthorizationError when the check fails.
 *
 * @param allowedRoles - One or more platform roles permitted to access the calling context.
 * @returns The authenticated user record.
 */
export async function requireRole(...allowedRoles: Role[]) {
  const user = await requireAuth();
  const userPermissions = ROLE_PERMISSIONS[user.role];
  const hasAccess = allowedRoles.some((role) => userPermissions.has(role));
  if (!hasAccess) {
    throw new AuthorizationError(
      `One of roles [${allowedRoles.join(", ")}] required, but user has role ${user.role}`
    );
  }
  return user;
}

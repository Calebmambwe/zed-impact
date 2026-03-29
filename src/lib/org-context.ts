/**
 * AsyncLocalStorage-based org context for multi-tenant query injection.
 * Used by the Prisma $extends middleware to auto-inject organizationId.
 */
import { AsyncLocalStorage } from "async_hooks";

interface OrgContext {
  orgId: string;
}

/** Thread-safe storage for current request's org context. */
export const orgStorage = new AsyncLocalStorage<OrgContext>();

/**
 * Returns the current org ID from AsyncLocalStorage, or undefined if not set.
 * Used inside Prisma query middleware to auto-inject organizationId.
 */
export function getOrgId(): string | undefined {
  return orgStorage.getStore()?.orgId;
}

/**
 * Runs a callback within the context of a specific org.
 * All Prisma queries inside the callback will be automatically scoped to this org.
 *
 * @param orgId - The organization ID to set as context
 * @param callback - The function to run within the org context
 */
export function withOrgContext<T>(orgId: string, callback: () => T): T {
  return orgStorage.run({ orgId }, callback);
}

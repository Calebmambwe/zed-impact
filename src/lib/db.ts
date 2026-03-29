/**
 * Prisma client singleton with multi-tenant query middleware.
 * Auto-injects organizationId on all tenant-scoped model queries
 * via AsyncLocalStorage context set by API routes.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getOrgId } from "./org-context";

// All models that have an organizationId field and require tenant scoping.
// Add new models here as they are implemented in future milestones.
const TENANT_MODELS = new Set([
  "orgMember",
  "orgApiKey",
  "customDomain",
  "featureFlag",
  "auditLog",
  "contact",
  "donation",
  "campaign",
  "donationForm",
  "event",
  "child",
  "sponsorship",
  "tag",
  "note",
  "segment",
  "emailCampaign",
  "payment",
  "product",
  "order",
  "membershipTier",
  "membership",
  "p2pFundraiser",
  "raffleBundle",
  "auctionItem",
  "staffTask",
  "buildingProject",
  "budget",
  "impactReport",
]);

/** Operations that should have organizationId injected into WHERE. */
const READ_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
]);

/** Operations that should have organizationId injected into data. */
const WRITE_OPS = new Set(["create", "createMany"]);

/**
 * Creates the extended Prisma client with org-context query middleware.
 * The middleware intercepts every query on tenant-scoped models and
 * automatically injects WHERE organizationId = <ctx> (read/update/delete)
 * or data.organizationId = <ctx> (create) from AsyncLocalStorage.
 */
function buildPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({ adapter });

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const orgId = getOrgId();

          // Only inject if we have an org context AND the model is tenant-scoped
          if (orgId && model && TENANT_MODELS.has(model)) {
            const mutableArgs = args as Record<string, unknown>;

            if (READ_OPS.has(operation)) {
              // Inject into WHERE clause
              const where = (mutableArgs.where ?? {}) as Record<
                string,
                unknown
              >;
              where.organizationId = orgId;
              mutableArgs.where = where;
            } else if (WRITE_OPS.has(operation)) {
              // Inject into data
              const data = (mutableArgs.data ?? {}) as Record<string, unknown>;
              if (!data.organizationId) {
                data.organizationId = orgId;
              }
              mutableArgs.data = data;
            }
          }

          return query(args);
        },
      },
    },
  });
}

// Extend the global namespace for the dev singleton
declare global {
  // eslint-disable-next-line no-var
  var __prisma: ReturnType<typeof buildPrismaClient> | undefined;
}

/**
 * Singleton Prisma client.
 * In development, stores on `global` to survive hot-reload.
 * In production, creates a new instance per process.
 */
export const prisma: ReturnType<typeof buildPrismaClient> =
  global.__prisma ?? buildPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

export default prisma;

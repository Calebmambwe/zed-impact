/**
 * Zod v4 schemas for Membership Tiers & Memberships API inputs.
 */
import { z } from "zod";

export const membershipIntervalEnum = z.enum(["MONTHLY", "QUARTERLY", "ANNUAL"]);
export const membershipStatusEnum = z.enum([
  "ACTIVE",
  "CANCELLED",
  "EXPIRED",
  "PAUSED",
]);

export const createMembershipTierSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  price: z.number().nonnegative(),
  interval: membershipIntervalEnum.optional().default("MONTHLY"),
  benefits: z.array(z.string()).optional(),
  isPublished: z.boolean().optional().default(false),
});

export type CreateMembershipTierInput = z.infer<
  typeof createMembershipTierSchema
>;

export const updateMembershipTierSchema = createMembershipTierSchema.partial();
export type UpdateMembershipTierInput = z.infer<
  typeof updateMembershipTierSchema
>;

export const membershipListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

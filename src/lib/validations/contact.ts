/**
 * Zod v4 validation schemas for contact and CRM inputs.
 */
import { z } from "zod";

export const createContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  type: z.enum(["DONOR", "VOLUNTEER", "SPONSOR", "STAFF", "BOARD", "OTHER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DECEASED"]).optional(),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  householdId: z.string().optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const importRowSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  type: z.enum(["DONOR", "VOLUNTEER", "SPONSOR", "STAFF", "BOARD", "OTHER"]).optional(),
});

export const tagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
    .optional(),
});

export const addTagSchema = z.object({
  tagId: z.string().min(1),
});

export const noteSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const segmentFilterSchema = z.array(
  z.object({
    field: z.string().min(1),
    operator: z.enum(["eq", "neq", "gt", "lt", "contains", "in"]),
    value: z.unknown(),
  })
);

export const createSegmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  filters: segmentFilterSchema,
});

export const updateSegmentSchema = createSegmentSchema.partial();

export const contactListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  type: z.enum(["DONOR", "VOLUNTEER", "SPONSOR", "STAFF", "BOARD", "OTHER"]).optional(),
  tag: z.string().optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ImportRow = z.infer<typeof importRowSchema>;
export type SegmentFilter = z.infer<typeof segmentFilterSchema>[number];
export type CreateSegmentInput = z.infer<typeof createSegmentSchema>;

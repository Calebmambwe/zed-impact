/**
 * Zod v4 schemas for Events & Ticket Types API inputs.
 */
import { z } from "zod";

export const eventTypeEnum = z.enum(["IN_PERSON", "VIRTUAL", "HYBRID"]);

export const createEventSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(5000).optional(),
  type: eventTypeEnum.optional().default("IN_PERSON"),
  location: z.string().max(500).optional(),
  virtualUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  isPublished: z.boolean().optional().default(false),
  maxCapacity: z.number().int().positive().optional(),
  campaignId: z.string().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = createEventSchema.partial();
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const eventListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  type: eventTypeEnum.optional(),
  isPublished: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
});

export const createTicketTypeSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  price: z.number().nonnegative().optional().default(0),
  quantity: z.number().int().positive().optional(),
});

export type CreateTicketTypeInput = z.infer<typeof createTicketTypeSchema>;

export const registerEventSchema = z.object({
  attendeeName: z.string().min(1).max(300),
  attendeeEmail: z.string().email(),
  ticketTypeId: z.string().optional(),
  quantity: z.number().int().positive().max(20).optional().default(1),
});

export type RegisterEventInput = z.infer<typeof registerEventSchema>;

export const checkInSchema = z.object({
  qrCode: z.string().min(1),
});

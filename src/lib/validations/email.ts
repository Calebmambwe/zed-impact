/**
 * Zod v4 validation schemas for email campaign inputs.
 */
import { z } from "zod";

const emailBlockSchema = z.object({
  type: z.enum(["heading", "text", "button", "image", "divider"]),
  content: z.string(),
  url: z.string().optional(),
  alt: z.string().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
});

export const createEmailCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(300),
  previewText: z.string().max(200).optional(),
  blocks: z.array(emailBlockSchema).default([]),
  segmentId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const updateEmailCampaignSchema = createEmailCampaignSchema.partial();

export const sendCampaignSchema = z.object({
  campaignId: z.string().min(1),
});

export const subscriberSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

export type EmailBlock = z.infer<typeof emailBlockSchema>;
export type CreateEmailCampaignInput = z.infer<typeof createEmailCampaignSchema>;
export type UpdateEmailCampaignInput = z.infer<typeof updateEmailCampaignSchema>;

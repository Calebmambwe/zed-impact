/**
 * Zod v4 schemas for all donation-related API inputs.
 * Used at route boundaries for request validation.
 */
import { z } from "zod";

/** Stripe checkout session creation */
export const checkoutSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  donorEmail: z.string().email("Invalid email address"),
  donorName: z.string().min(1, "Donor name is required").max(200),
  isRecurring: z.boolean().optional().default(false),
  frequency: z.enum(["monthly", "quarterly", "annual"]).optional(),
  campaignId: z.string().optional(),
  formId: z.string().optional(),
  message: z.string().max(500).optional(),
  isAnonymous: z.boolean().optional().default(false),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** DPO Group mobile money request */
export const mobileMoneySchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  phoneNumber: z.string().min(7, "Phone number is required"),
  provider: z.enum(["MTN_MOMO", "AIRTEL_MONEY", "ZAMTEL_KWACHA"]),
  donorEmail: z.string().email("Invalid email address"),
  donorName: z.string().min(1, "Donor name is required").max(200),
  campaignId: z.string().optional(),
  formId: z.string().optional(),
  message: z.string().max(500).optional(),
});

export type MobileMoneyInput = z.infer<typeof mobileMoneySchema>;

/** Manual donation record (admin entry) */
export const donationRecordSchema = z.object({
  donorName: z.string().min(1, "Donor name is required").max(200),
  donorEmail: z.string().email("Invalid email address"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3).default("USD"),
  paymentMethod: z
    .enum(["CARD", "BANK_TRANSFER", "MOBILE_MONEY", "CHECK", "CASH", "OTHER"])
    .default("CASH"),
  campaignId: z.string().optional(),
  notes: z.string().max(1000).optional(),
  donationDate: z.string().optional(), // ISO date string
  isAnonymous: z.boolean().optional().default(false),
});

export type DonationRecordInput = z.infer<typeof donationRecordSchema>;

/** Update a donation record */
export const donationUpdateSchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED", "CANCELLED"]).optional(),
  notes: z.string().max(1000).optional(),
  message: z.string().max(500).optional(),
});

export type DonationUpdateInput = z.infer<typeof donationUpdateSchema>;

/** Campaign create/update */
export const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(2000).optional().nullable(),
  type: z
    .enum([
      "DONATION",
      "EVENT",
      "RAFFLE",
      "AUCTION",
      "P2P",
      "MEMBERSHIP",
      "EMERGENCY",
    ])
    .default("DONATION"),
  status: z
    .enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"])
    .optional(),
  goalAmount: z.number().positive().optional().nullable(),
  startDate: z.string().optional().nullable(), // ISO date
  endDate: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

export type CampaignInput = z.infer<typeof campaignSchema>;

/** Campaign partial update */
export const campaignUpdateSchema = campaignSchema.partial();
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;

/** Donation form field definition */
export const formFieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text", "email", "amount", "select", "checkbox", "divider"]),
  label: z.string().min(1).max(200),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export type FormField = z.infer<typeof formFieldSchema>;

/** Donation form create/update */
export const donationFormSchema = z.object({
  name: z.string().min(1, "Form name is required").max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  fields: z.array(formFieldSchema),
  isPublished: z.boolean().optional().default(false),
  campaignId: z.string().optional().nullable(),
});

export type DonationFormInput = z.infer<typeof donationFormSchema>;

/** Donation form partial update */
export const donationFormUpdateSchema = donationFormSchema.partial();
export type DonationFormUpdateInput = z.infer<typeof donationFormUpdateSchema>;

/** Tribute donation */
export const tributeSchema = z.object({
  tributeType: z.enum(["in_honor", "in_memory"]),
  tributeeName: z.string().min(1).max(200),
  notificationEmail: z.string().email().optional().nullable(),
  message: z.string().max(500).optional().nullable(),
});

export type TributeInput = z.infer<typeof tributeSchema>;

/** Query params for donation list */
export const donationListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z
    .enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED", "CANCELLED"])
    .optional(),
  campaignId: z.string().optional(),
});

export type DonationListQuery = z.infer<typeof donationListQuerySchema>;

/** Query params for campaign list */
export const campaignListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"])
    .optional(),
});

export type CampaignListQuery = z.infer<typeof campaignListQuerySchema>;

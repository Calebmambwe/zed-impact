/**
 * Zod v4 schemas for Store (Products, Orders) API inputs.
 */
import { z } from "zod";

export const orderStatusEnum = z.enum([
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
]);

export const createProductSchema = z.object({
  name: z.string().min(1).max(300),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(5000).optional(),
  imageUrl: z.string().url().optional(),
  price: z.number().nonnegative(),
  currency: z.string().length(3).optional().default("USD"),
  isPublished: z.boolean().optional().default(false),
  variants: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        sku: z.string().max(100).optional(),
        price: z.number().nonnegative().optional(),
        inventory: z.number().int().nonnegative().optional().default(0),
      })
    )
    .optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  isPublished: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
});

export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: orderStatusEnum.optional(),
});

export const createOrderSchema = z.object({
  buyerName: z.string().min(1).max(300),
  buyerEmail: z.string().email(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string().optional(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  shippingAddress: z
    .object({
      line1: z.string(),
      line2: z.string().optional(),
      city: z.string(),
      state: z.string().optional(),
      postalCode: z.string(),
      country: z.string(),
    })
    .optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

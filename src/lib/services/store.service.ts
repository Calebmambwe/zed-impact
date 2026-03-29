/**
 * Store service for ZedImpact.
 * Handles product CRUD, variants, and order management.
 * Framework-agnostic — no HTTP imports.
 */
import { prisma } from "@/lib/db";
import { withOrgContext } from "@/lib/org-context";
import type {
  CreateProductInput,
  UpdateProductInput,
  CreateOrderInput,
} from "@/lib/validations/store";

export interface ProductListOptions {
  page?: number;
  limit?: number;
  isPublished?: boolean;
}

export interface OrderListOptions {
  page?: number;
  limit?: number;
  status?: "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
}

/**
 * Returns a paginated list of products for an org.
 */
export async function listProducts(
  orgId: string,
  opts: ProductListOptions = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (opts.isPublished !== undefined) where.isPublished = opts.isPublished;

  return withOrgContext(orgId, async () => {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { variants: true },
      }),
      prisma.product.count({ where }),
    ]);
    return { products, meta: { page, limit, total } };
  });
}

/**
 * Returns a single product by ID.
 */
export async function getProduct(orgId: string, productId: string) {
  return withOrgContext(orgId, async () => {
    return prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });
  });
}

/**
 * Returns a single product by slug for public pages.
 */
export async function getProductBySlug(
  orgId: string,
  slug: string,
  publicOnly = false
) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { variants: true },
  });
  if (!product || product.organizationId !== orgId) return null;
  if (publicOnly && !product.isPublished) return null;
  return product;
}

/**
 * Creates a product with optional variants.
 */
export async function createProduct(
  orgId: string,
  data: CreateProductInput
) {
  return withOrgContext(orgId, async () => {
    return prisma.product.create({
      data: {
        organizationId: orgId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        imageUrl: data.imageUrl,
        price: data.price,
        currency: data.currency ?? "USD",
        isPublished: data.isPublished ?? false,
        variants: data.variants
          ? {
              create: data.variants.map((v) => ({
                name: v.name,
                sku: v.sku,
                price: v.price,
                inventory: v.inventory ?? 0,
              })),
            }
          : undefined,
      },
      include: { variants: true },
    });
  });
}

/**
 * Updates a product.
 */
export async function updateProduct(
  orgId: string,
  productId: string,
  data: UpdateProductInput
) {
  return withOrgContext(orgId, async () => {
    const existing = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!existing || existing.organizationId !== orgId) return null;

    return prisma.product.update({
      where: { id: productId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
      include: { variants: true },
    });
  });
}

/**
 * Returns a paginated list of orders for an org.
 */
export async function listOrders(orgId: string, opts: OrderListOptions = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (opts.status) where.status = opts.status;

  return withOrgContext(orgId, async () => {
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          items: {
            include: {
              product: { select: { name: true } },
              variant: { select: { name: true } },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);
    return { orders, meta: { page, limit, total } };
  });
}

/**
 * Creates an order. Validates product availability and computes total.
 */
export async function createOrder(
  orgId: string,
  data: CreateOrderInput
): Promise<
  | { order: Awaited<ReturnType<typeof prisma.order.create>> }
  | { error: "PRODUCT_NOT_FOUND"; productId: string }
  | { error: "INSUFFICIENT_INVENTORY"; productId: string }
> {
  // Fetch all products in batch to avoid N+1
  const productIds = data.items.map((i) => i.productId);
  const variantIds = data.items
    .map((i) => i.variantId)
    .filter((id): id is string => !!id);

  const [products, variants] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds }, organizationId: orgId },
    }),
    variantIds.length > 0
      ? prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
        })
      : Promise.resolve([]),
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  let totalAmount = 0;

  for (const item of data.items) {
    const product = productMap.get(item.productId);
    if (!product) return { error: "PRODUCT_NOT_FOUND", productId: item.productId };

    const variant = item.variantId ? variantMap.get(item.variantId) : null;

    // Inventory check for variants
    if (variant && variant.inventory < item.quantity) {
      return { error: "INSUFFICIENT_INVENTORY", productId: item.productId };
    }

    const unitPrice = variant?.price ?? product.price;
    totalAmount += unitPrice * item.quantity;
  }

  const order = await prisma.order.create({
    data: {
      organizationId: orgId,
      buyerName: data.buyerName,
      buyerEmail: data.buyerEmail,
      totalAmount,
      currency: "USD",
      shippingAddress: data.shippingAddress ?? undefined,
      notes: data.notes,
      items: {
        create: data.items.map((item) => {
          const product = productMap.get(item.productId)!;
          const variant = item.variantId
            ? variantMap.get(item.variantId)
            : null;
          const unitPrice = variant?.price ?? product.price;
          return {
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice,
          };
        }),
      },
    },
    include: {
      items: {
        include: {
          product: { select: { name: true } },
          variant: { select: { name: true } },
        },
      },
    },
  });

  // Decrement variant inventory
  for (const item of data.items) {
    if (item.variantId) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { inventory: { decrement: item.quantity } },
      });
    }
  }

  return { order };
}

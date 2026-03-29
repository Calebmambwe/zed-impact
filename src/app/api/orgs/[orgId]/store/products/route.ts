import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
} from "@/lib/org-auth";
import { listProducts, createProduct } from "@/lib/services/store.service";
import {
  createProductSchema,
  productListQuerySchema,
} from "@/lib/validations/store";

/**
 * GET /api/orgs/[orgId]/store/products
 * Returns a paginated list of products for the org.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId } = await params;
    await requireOrgRole(user.id, orgId, "STAFF");

    const { searchParams } = new URL(req.url);
    const query = productListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      isPublished: searchParams.get("isPublished") ?? undefined,
    });

    const result = await listProducts(orgId, query);

    return NextResponse.json({
      success: true,
      data: result.products,
      error: null,
      meta: result.meta,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query params",
            details: error.issues,
          },
        },
        { status: 422 }
      );
    }
    return errorResponse(error);
  }
}

/**
 * POST /api/orgs/[orgId]/store/products
 * Creates a new product.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId } = await params;
    await requireOrgRole(user.id, orgId, "MANAGER");

    const body: unknown = await req.json();
    const data = createProductSchema.parse(body);
    const product = await createProduct(orgId, data);

    return NextResponse.json(
      { success: true, data: product, error: null },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid product data",
            details: error.issues,
          },
        },
        { status: 422 }
      );
    }
    if (error instanceof Error && error.message.includes("slug")) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "CONFLICT", message: error.message },
        },
        { status: 409 }
      );
    }
    return errorResponse(error);
  }
}

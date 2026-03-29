import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
} from "@/lib/org-auth";
import { listContacts, createContact } from "@/lib/services/contact.service";
import {
  contactListQuerySchema,
  createContactSchema,
} from "@/lib/validations/contact";

/**
 * GET /api/orgs/[orgId]/contacts
 * Returns paginated contacts list with optional search, type, and tag filters.
 * Requires STAFF or higher role.
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
    const query = contactListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      tag: searchParams.get("tag") ?? undefined,
    });

    const result = await listContacts(orgId, query);

    return NextResponse.json({
      success: true,
      data: { contacts: result.contacts },
      error: null,
      meta: result.meta,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Invalid query params", details: error.issues },
        },
        { status: 422 }
      );
    }
    return errorResponse(error);
  }
}

/**
 * POST /api/orgs/[orgId]/contacts
 * Creates a new contact. Requires STAFF or higher role.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId } = await params;
    await requireOrgRole(user.id, orgId, "STAFF");

    const body: unknown = await req.json();
    const data = createContactSchema.parse(body);

    const contact = await createContact(orgId, data, user.id);

    return NextResponse.json({ success: true, data: contact, error: null }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Invalid contact data", details: error.issues },
        },
        { status: 422 }
      );
    }
    return errorResponse(error);
  }
}

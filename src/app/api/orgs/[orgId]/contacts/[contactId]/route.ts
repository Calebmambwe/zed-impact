import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
} from "@/lib/org-auth";
import {
  getContactById,
  updateContact,
  deleteContact,
} from "@/lib/services/contact.service";
import { updateContactSchema } from "@/lib/validations/contact";

/**
 * GET /api/orgs/[orgId]/contacts/[contactId]
 * Returns a single contact with tags, notes, activity, and donation summary.
 * Requires STAFF or higher role.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; contactId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId, contactId } = await params;
    await requireOrgRole(user.id, orgId, "STAFF");

    const contact = await getContactById(orgId, contactId);

    return NextResponse.json({ success: true, data: contact, error: null });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * PATCH /api/orgs/[orgId]/contacts/[contactId]
 * Partially updates a contact. Requires STAFF or higher role.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string; contactId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId, contactId } = await params;
    await requireOrgRole(user.id, orgId, "STAFF");

    const body: unknown = await req.json();
    const data = updateContactSchema.parse(body);

    const contact = await updateContact(orgId, contactId, data, user.id);

    return NextResponse.json({ success: true, data: contact, error: null });
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

/**
 * DELETE /api/orgs/[orgId]/contacts/[contactId]
 * Hard-deletes a contact. Requires ADMIN or higher role.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; contactId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId, contactId } = await params;
    await requireOrgRole(user.id, orgId, "ADMIN");

    await deleteContact(orgId, contactId);

    return NextResponse.json({ success: true, data: null, error: null });
  } catch (error) {
    return errorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
} from "@/lib/org-auth";
import { importContacts } from "@/lib/services/contact.service";
import { importRowSchema } from "@/lib/validations/contact";

/**
 * POST /api/orgs/[orgId]/contacts/import
 * Accepts a JSON array of import rows (parsed from CSV client-side).
 * Requires STAFF or higher role.
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
    const rows = z.array(importRowSchema).parse(body);

    const result = await importContacts(orgId, rows, user.id);

    return NextResponse.json({ success: true, data: result, error: null }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Invalid import data", details: error.issues },
        },
        { status: 422 }
      );
    }
    return errorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
} from "@/lib/org-auth";
import { listForms, createForm } from "@/lib/services/donation-form.service";
import { donationFormSchema } from "@/lib/validations/donation";

/**
 * GET /api/orgs/[orgId]/forms
 * Returns all donation forms for the org.
 * Requires STAFF or higher role.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId } = await params;
    await requireOrgRole(user.id, orgId, "STAFF");

    const forms = await listForms(orgId);

    return NextResponse.json({ success: true, data: forms, error: null });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/orgs/[orgId]/forms
 * Creates a new donation form.
 * Requires MANAGER or higher role.
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
    const input = donationFormSchema.parse(body);

    const form = await createForm(orgId, {
      name: input.name,
      slug: input.slug,
      fields: input.fields,
      isPublished: input.isPublished,
      campaignId: input.campaignId,
    });

    return NextResponse.json(
      { success: true, data: form, error: null },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Invalid input", details: error.issues },
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

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
  NotFoundError,
} from "@/lib/org-auth";
import {
  getFormById,
  updateForm,
  deleteForm,
} from "@/lib/services/donation-form.service";
import { donationFormUpdateSchema } from "@/lib/validations/donation";

/**
 * GET /api/orgs/[orgId]/forms/[formId]
 * Returns a single donation form with its fields.
 * Requires STAFF or higher role.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; formId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId, formId } = await params;
    await requireOrgRole(user.id, orgId, "STAFF");

    const form = await getFormById(orgId, formId);
    if (!form) {
      throw new NotFoundError("Donation form not found");
    }

    return NextResponse.json({ success: true, data: form, error: null });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * PATCH /api/orgs/[orgId]/forms/[formId]
 * Partially updates a donation form.
 * Requires MANAGER or higher role.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string; formId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId, formId } = await params;
    await requireOrgRole(user.id, orgId, "MANAGER");

    const body: unknown = await req.json();
    const input = donationFormUpdateSchema.parse(body);

    const form = await getFormById(orgId, formId);
    if (!form) {
      throw new NotFoundError("Donation form not found");
    }

    const updated = await updateForm(orgId, formId, {
      name: input.name,
      slug: input.slug,
      fields: input.fields,
      isPublished: input.isPublished,
      campaignId: input.campaignId,
    });

    return NextResponse.json({ success: true, data: updated, error: null });
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

/**
 * DELETE /api/orgs/[orgId]/forms/[formId]
 * Deletes a donation form.
 * Requires MANAGER or higher role.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; formId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId, formId } = await params;
    await requireOrgRole(user.id, orgId, "MANAGER");

    const form = await getFormById(orgId, formId);
    if (!form) {
      throw new NotFoundError("Donation form not found");
    }

    await deleteForm(orgId, formId);

    return NextResponse.json({ success: true, data: null, error: null });
  } catch (error) {
    return errorResponse(error);
  }
}

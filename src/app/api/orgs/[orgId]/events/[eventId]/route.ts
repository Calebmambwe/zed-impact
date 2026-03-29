import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
  NotFoundError,
} from "@/lib/org-auth";
import {
  getEvent,
  updateEvent,
  deleteEvent,
} from "@/lib/services/event.service";
import { updateEventSchema } from "@/lib/validations/events";

/**
 * GET /api/orgs/[orgId]/events/[eventId]
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; eventId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId, eventId } = await params;
    await requireOrgRole(user.id, orgId, "STAFF");

    const event = await getEvent(orgId, eventId);
    if (!event) throw new NotFoundError("Event not found");

    return NextResponse.json({ success: true, data: event, error: null });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * PATCH /api/orgs/[orgId]/events/[eventId]
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string; eventId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId, eventId } = await params;
    await requireOrgRole(user.id, orgId, "MANAGER");

    const body: unknown = await req.json();
    const data = updateEventSchema.parse(body);
    const event = await updateEvent(orgId, eventId, data);
    if (!event) throw new NotFoundError("Event not found");

    return NextResponse.json({ success: true, data: event, error: null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid event data",
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
 * DELETE /api/orgs/[orgId]/events/[eventId]
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; eventId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId, eventId } = await params;
    await requireOrgRole(user.id, orgId, "ADMIN");

    const deleted = await deleteEvent(orgId, eventId);
    if (!deleted) throw new NotFoundError("Event not found");

    return NextResponse.json({ success: true, data: null, error: null });
  } catch (error) {
    return errorResponse(error);
  }
}

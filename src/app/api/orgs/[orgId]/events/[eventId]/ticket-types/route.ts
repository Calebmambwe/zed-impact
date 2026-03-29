import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
  NotFoundError,
} from "@/lib/org-auth";
import { addTicketType } from "@/lib/services/event.service";
import { createTicketTypeSchema } from "@/lib/validations/events";

/**
 * POST /api/orgs/[orgId]/events/[eventId]/ticket-types
 * Adds a ticket type to an event.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string; eventId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId, eventId } = await params;
    await requireOrgRole(user.id, orgId, "MANAGER");

    const body: unknown = await req.json();
    const data = createTicketTypeSchema.parse(body);

    const ticketType = await addTicketType(orgId, eventId, data);
    if (!ticketType) throw new NotFoundError("Event not found");

    return NextResponse.json(
      { success: true, data: ticketType, error: null },
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
            message: "Invalid ticket type data",
            details: error.issues,
          },
        },
        { status: 422 }
      );
    }
    return errorResponse(error);
  }
}

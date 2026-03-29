import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
  NotFoundError,
} from "@/lib/org-auth";
import {
  listAttendees,
  checkInAttendee,
} from "@/lib/services/event.service";
import { checkInSchema } from "@/lib/validations/events";

/**
 * GET /api/orgs/[orgId]/events/[eventId]/attendees
 * Lists all registrations for an event.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string; eventId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId, eventId } = await params;
    await requireOrgRole(user.id, orgId, "STAFF");

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? 1);
    const limit = Number(searchParams.get("limit") ?? 50);

    const result = await listAttendees(orgId, eventId, { page, limit });
    if (!result) throw new NotFoundError("Event not found");

    return NextResponse.json({
      success: true,
      data: result.registrations,
      error: null,
      meta: result.meta,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/orgs/[orgId]/events/[eventId]/attendees/check-in
 * Check-in an attendee by QR code.
 * Usage: POST with body { qrCode: "..." }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string; eventId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { orgId } = await params;
    await requireOrgRole(user.id, orgId, "STAFF");

    const body: unknown = await req.json();
    const { qrCode } = checkInSchema.parse(body);

    const result = await checkInAttendee(orgId, qrCode);

    if ("error" in result) {
      if (result.error === "NOT_FOUND") {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: { code: "NOT_FOUND", message: "Registration not found" },
          },
          { status: 404 }
        );
      }
      if (result.error === "ALREADY_CHECKED_IN") {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: "ALREADY_CHECKED_IN",
              message: "Attendee already checked in",
            },
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: "registration" in result ? result.registration : null,
      error: null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid check-in data",
            details: error.issues,
          },
        },
        { status: 422 }
      );
    }
    return errorResponse(error);
  }
}

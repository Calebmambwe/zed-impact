import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthenticatedUser,
  requireOrgRole,
  errorResponse,
} from "@/lib/org-auth";
import { listEvents, createEvent } from "@/lib/services/event.service";
import {
  createEventSchema,
  eventListQuerySchema,
} from "@/lib/validations/events";

/**
 * GET /api/orgs/[orgId]/events
 * Returns a paginated list of events for the org.
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
    const query = eventListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      isPublished: searchParams.get("isPublished") ?? undefined,
    });

    const result = await listEvents(orgId, query);

    return NextResponse.json({
      success: true,
      data: result.events,
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
 * POST /api/orgs/[orgId]/events
 * Creates a new event.
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
    const data = createEventSchema.parse(body);
    const event = await createEvent(orgId, data);

    return NextResponse.json(
      { success: true, data: event, error: null },
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

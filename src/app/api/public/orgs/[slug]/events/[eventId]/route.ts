import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getEventBySlug, getEvent, registerForEvent } from "@/lib/services/event.service";

const registerSchema = z.object({
  attendeeName: z.string().min(1).max(300),
  attendeeEmail: z.string().email(),
  ticketTypeId: z.string().optional(),
  quantity: z.number().int().positive().optional().default(1),
});

/**
 * GET /api/public/orgs/[slug]/events/[eventId]
 * Public endpoint — no authentication required.
 * Returns event detail with ticket types.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; eventId: string }> }
) {
  try {
    const { slug, eventId } = await params;

    const org = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!org) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "NOT_FOUND", message: "Organization not found" },
        },
        { status: 404 }
      );
    }

    // eventId could be either an ID or a slug
    const event =
      (await getEvent(org.id, eventId)) ??
      (await getEventBySlug(org.id, eventId, true));

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "NOT_FOUND", message: "Event not found" },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: event, error: null });
  } catch (error) {
    console.error("[ZedImpact] Public event detail error:", error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/public/orgs/[slug]/events/[eventId]
 * Public endpoint — no authentication required.
 * Registers an attendee for an event.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; eventId: string }> }
) {
  try {
    const { slug, eventId } = await params;

    const org = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!org) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "NOT_FOUND", message: "Organization not found" },
        },
        { status: 404 }
      );
    }

    const body: unknown = await req.json();
    const data = registerSchema.parse(body);

    const result = await registerForEvent(org.id, eventId, data);

    if ("error" in result && result.error !== undefined) {
      const errorCode = result.error;
      const statusMap: Record<string, number> = {
        EVENT_NOT_FOUND: 404,
        CAPACITY_EXCEEDED: 409,
        INVALID_TICKET_TYPE: 422,
        TICKET_TYPE_SOLD_OUT: 409,
      };
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: errorCode, message: errorCode.replace(/_/g, " ") },
        },
        { status: statusMap[errorCode] ?? 400 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.registration, error: null },
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
            message: "Invalid registration data",
            details: error.issues,
          },
        },
        { status: 422 }
      );
    }
    console.error("[ZedImpact] Event registration error:", error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    );
  }
}

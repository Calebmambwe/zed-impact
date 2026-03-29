/**
 * Event service for ZedImpact.
 * Handles event CRUD, ticket types, public listing, and attendee registration.
 * Framework-agnostic — no HTTP imports.
 */
import { prisma } from "@/lib/db";
import { withOrgContext } from "@/lib/org-context";
import type {
  CreateEventInput,
  UpdateEventInput,
  CreateTicketTypeInput,
  RegisterEventInput,
} from "@/lib/validations/events";

export interface EventListOptions {
  page?: number;
  limit?: number;
  type?: "IN_PERSON" | "VIRTUAL" | "HYBRID";
  isPublished?: boolean;
}

/**
 * Returns a paginated list of events for an org.
 */
export async function listEvents(orgId: string, opts: EventListOptions = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (opts.type) where.type = opts.type;
  if (opts.isPublished !== undefined) where.isPublished = opts.isPublished;

  return withOrgContext(orgId, async () => {
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { startDate: "asc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          type: true,
          location: true,
          virtualUrl: true,
          imageUrl: true,
          startDate: true,
          endDate: true,
          isPublished: true,
          maxCapacity: true,
          createdAt: true,
          _count: { select: { registrations: true } },
        },
      }),
      prisma.event.count({ where }),
    ]);
    return { events, meta: { page, limit, total } };
  });
}

/**
 * Returns a single event with its ticket types.
 */
export async function getEvent(orgId: string, eventId: string) {
  return withOrgContext(orgId, async () => {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: true,
        _count: { select: { registrations: true } },
      },
    });
    return event;
  });
}

/**
 * Returns a single event by slug (for public pages).
 * Checks isPublished for public access.
 */
export async function getEventBySlug(
  orgId: string,
  slug: string,
  publicOnly = false
) {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      ticketTypes: { orderBy: { price: "asc" } },
      _count: { select: { registrations: true } },
    },
  });
  if (!event || event.organizationId !== orgId) return null;
  if (publicOnly && !event.isPublished) return null;
  return event;
}

/**
 * Creates a new event.
 */
export async function createEvent(
  orgId: string,
  data: CreateEventInput
) {
  return withOrgContext(orgId, async () => {
    return prisma.event.create({
      data: {
        organizationId: orgId,
        title: data.title,
        slug: data.slug,
        description: data.description,
        type: data.type ?? "IN_PERSON",
        location: data.location,
        virtualUrl: data.virtualUrl,
        imageUrl: data.imageUrl,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        isPublished: data.isPublished ?? false,
        maxCapacity: data.maxCapacity,
        campaignId: data.campaignId,
      },
    });
  });
}

/**
 * Updates an existing event.
 */
export async function updateEvent(
  orgId: string,
  eventId: string,
  data: UpdateEventInput
) {
  return withOrgContext(orgId, async () => {
    const existing = await prisma.event.findUnique({ where: { id: eventId } });
    if (!existing || existing.organizationId !== orgId) return null;

    return prisma.event.update({
      where: { id: eventId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.virtualUrl !== undefined && { virtualUrl: data.virtualUrl }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.startDate !== undefined && {
          startDate: new Date(data.startDate),
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
        ...(data.maxCapacity !== undefined && {
          maxCapacity: data.maxCapacity,
        }),
        ...(data.campaignId !== undefined && { campaignId: data.campaignId }),
      },
    });
  });
}

/**
 * Deletes an event (admin only).
 */
export async function deleteEvent(orgId: string, eventId: string) {
  return withOrgContext(orgId, async () => {
    const existing = await prisma.event.findUnique({ where: { id: eventId } });
    if (!existing || existing.organizationId !== orgId) return false;
    await prisma.event.delete({ where: { id: eventId } });
    return true;
  });
}

/**
 * Adds a ticket type to an event.
 */
export async function addTicketType(
  orgId: string,
  eventId: string,
  data: CreateTicketTypeInput
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.organizationId !== orgId) return null;

  return prisma.ticketType.create({
    data: {
      eventId,
      name: data.name,
      description: data.description,
      price: data.price ?? 0,
      quantity: data.quantity,
    },
  });
}

/**
 * Registers an attendee for an event.
 */
export async function registerForEvent(
  orgId: string,
  eventId: string,
  data: RegisterEventInput
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { ticketTypes: true, _count: { select: { registrations: true } } },
  });
  if (!event || event.organizationId !== orgId || !event.isPublished) {
    return { error: "EVENT_NOT_FOUND" as const };
  }

  // Capacity check
  if (event.maxCapacity !== null) {
    const totalRegistered = await prisma.eventRegistration.aggregate({
      where: { eventId },
      _sum: { quantity: true },
    });
    const used = totalRegistered._sum.quantity ?? 0;
    if (used + (data.quantity ?? 1) > event.maxCapacity) {
      return { error: "CAPACITY_EXCEEDED" as const };
    }
  }

  // Validate ticket type if provided
  if (data.ticketTypeId) {
    const ticketType = event.ticketTypes.find(
      (tt) => tt.id === data.ticketTypeId
    );
    if (!ticketType) return { error: "INVALID_TICKET_TYPE" as const };

    // Ticket type quantity check
    if (ticketType.quantity !== null) {
      const sold = await prisma.eventRegistration.aggregate({
        where: { ticketTypeId: data.ticketTypeId },
        _sum: { quantity: true },
      });
      const soldCount = sold._sum.quantity ?? 0;
      if (soldCount + (data.quantity ?? 1) > ticketType.quantity) {
        return { error: "TICKET_TYPE_SOLD_OUT" as const };
      }
    }
  }

  const ticketType = data.ticketTypeId
    ? event.ticketTypes.find((tt) => tt.id === data.ticketTypeId)
    : null;
  const unitPrice = ticketType?.price ?? 0;
  const totalPaid = unitPrice * (data.quantity ?? 1);

  const registration = await prisma.eventRegistration.create({
    data: {
      organizationId: orgId,
      eventId,
      ticketTypeId: data.ticketTypeId,
      attendeeName: data.attendeeName,
      attendeeEmail: data.attendeeEmail,
      quantity: data.quantity ?? 1,
      totalPaid,
    },
  });

  return { registration };
}

/**
 * Returns attendees for an event (paginated).
 */
export async function listAttendees(
  orgId: string,
  eventId: string,
  opts: { page?: number; limit?: number } = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(200, opts.limit ?? 50);
  const skip = (page - 1) * limit;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.organizationId !== orgId) return null;

  const [registrations, total] = await Promise.all([
    prisma.eventRegistration.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
      include: { ticketType: { select: { name: true } } },
    }),
    prisma.eventRegistration.count({ where: { eventId } }),
  ]);

  return { registrations, meta: { page, limit, total } };
}

/**
 * Checks in an attendee by QR code.
 */
export async function checkInAttendee(orgId: string, qrCode: string) {
  const registration = await prisma.eventRegistration.findUnique({
    where: { qrCode },
  });
  if (!registration || registration.organizationId !== orgId) {
    return { error: "NOT_FOUND" as const };
  }
  if (registration.checkedIn) {
    return { error: "ALREADY_CHECKED_IN" as const };
  }

  const updated = await prisma.eventRegistration.update({
    where: { qrCode },
    data: { checkedIn: true, checkedInAt: new Date() },
  });

  return { registration: updated };
}

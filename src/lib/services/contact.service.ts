/**
 * Contact service for ZedImpact CRM.
 * Provides full CRUD, activity logging, tag management, CSV import/export,
 * segment building, and household linking — all org-scoped.
 */
import Papa from "papaparse";
import { prisma } from "@/lib/db";
import { withOrgContext } from "@/lib/org-context";
import { NotFoundError } from "@/lib/org-auth";
import type {
  CreateContactInput,
  UpdateContactInput,
  ImportRow,
  SegmentFilter,
} from "@/lib/validations/contact";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ContactListOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  tag?: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

export interface SegmentPreviewResult {
  count: number;
  sample: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    type: string;
  }>;
}

// ── Activity logging ────────────────────────────────────────────────────────

/**
 * Creates a ContactActivity record for the given contact.
 * Must be called from within an orgStorage context.
 */
async function logActivity(
  organizationId: string,
  contactId: string,
  type: string,
  description: string,
  actorId?: string,
  metadata?: Record<string, unknown>
) {
  await prisma.contactActivity.create({
    data: {
      organizationId,
      contactId,
      type,
      description,
      actorId: actorId ?? null,
      metadata: metadata ?? undefined,
    },
  });
}

// ── Contact CRUD ────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of contacts for the org, with optional
 * search, type filter, and tag filter.
 */
export async function listContacts(orgId: string, opts: ContactListOptions = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  return withOrgContext(orgId, async () => {
    const where: Record<string, unknown> = {};

    if (opts.type) {
      where.type = opts.type;
    }

    if (opts.search) {
      where.OR = [
        { firstName: { contains: opts.search, mode: "insensitive" } },
        { lastName: { contains: opts.search, mode: "insensitive" } },
        { email: { contains: opts.search, mode: "insensitive" } },
      ];
    }

    if (opts.tag) {
      where.contactTags = {
        some: {
          tag: { name: opts.tag },
        },
      };
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          type: true,
          status: true,
          lifetimeValue: true,
          lastDonationAt: true,
          city: true,
          country: true,
          createdAt: true,
          contactTags: {
            select: {
              tag: { select: { id: true, name: true, color: true } },
            },
          },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    return {
      contacts: contacts.map((c) => ({
        ...c,
        tags: c.contactTags.map((ct) => ct.tag),
      })),
      meta: { page, limit, total },
    };
  });
}

/**
 * Returns a single contact with tags, recent notes, activity timeline,
 * and donation summary.
 */
export async function getContactById(orgId: string, contactId: string) {
  return withOrgContext(orgId, async () => {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId },
      include: {
        contactTags: {
          include: { tag: true },
        },
        contactNotes: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { author: { select: { id: true, name: true, email: true } } },
        },
        activity: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        donations: {
          where: { status: "COMPLETED" },
          select: { id: true, amount: true, currency: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        emailPreference: true,
      },
    });

    if (!contact) throw new NotFoundError("Contact not found");

    return {
      ...contact,
      tags: contact.contactTags.map((ct) => ct.tag),
    };
  });
}

/**
 * Creates a new contact and logs the creation activity.
 */
export async function createContact(
  orgId: string,
  data: CreateContactInput,
  actorId: string
) {
  return withOrgContext(orgId, async () => {
    const contact = await prisma.contact.create({
      data: {
        organizationId: orgId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone ?? null,
        type: data.type ?? "DONOR",
        status: data.status ?? "ACTIVE",
        address: data.address ?? null,
        city: data.city ?? null,
        country: data.country ?? null,
        notes: data.notes ?? null,
        customFields: data.customFields ?? undefined,
        householdId: data.householdId ?? null,
      },
    });

    await logActivity(
      orgId,
      contact.id,
      "contact.created",
      `Contact ${contact.firstName} ${contact.lastName} was created`,
      actorId
    );

    return contact;
  });
}

/**
 * Partially updates a contact and logs the update activity.
 */
export async function updateContact(
  orgId: string,
  contactId: string,
  data: UpdateContactInput,
  actorId: string
) {
  return withOrgContext(orgId, async () => {
    const existing = await prisma.contact.findFirst({ where: { id: contactId } });
    if (!existing) throw new NotFoundError("Contact not found");

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.customFields !== undefined && { customFields: data.customFields }),
        ...(data.householdId !== undefined && { householdId: data.householdId }),
      },
    });

    await logActivity(
      orgId,
      contactId,
      "contact.updated",
      `Contact ${contact.firstName} ${contact.lastName} was updated`,
      actorId
    );

    return contact;
  });
}

/**
 * Hard-deletes a contact. Cascades to activity, notes, tags via FK.
 */
export async function deleteContact(orgId: string, contactId: string) {
  return withOrgContext(orgId, async () => {
    const existing = await prisma.contact.findFirst({ where: { id: contactId } });
    if (!existing) throw new NotFoundError("Contact not found");

    await prisma.contact.delete({ where: { id: contactId } });
  });
}

// ── Tags ────────────────────────────────────────────────────────────────────

/**
 * Adds a tag to a contact and logs the activity.
 */
export async function addTag(
  orgId: string,
  contactId: string,
  tagId: string,
  actorId: string
) {
  return withOrgContext(orgId, async () => {
    const existing = await prisma.contact.findFirst({ where: { id: contactId } });
    if (!existing) throw new NotFoundError("Contact not found");

    const tag = await prisma.tag.findFirst({ where: { id: tagId } });
    if (!tag) throw new NotFoundError("Tag not found");

    await prisma.contactTag.upsert({
      where: { contactId_tagId: { contactId, tagId } },
      create: { contactId, tagId },
      update: {},
    });

    await logActivity(
      orgId,
      contactId,
      "contact.tag_added",
      `Tag "${tag.name}" was added`,
      actorId,
      { tagId, tagName: tag.name }
    );
  });
}

/**
 * Removes a tag from a contact and logs the activity.
 */
export async function removeTag(
  orgId: string,
  contactId: string,
  tagId: string,
  actorId: string
) {
  return withOrgContext(orgId, async () => {
    const existing = await prisma.contact.findFirst({ where: { id: contactId } });
    if (!existing) throw new NotFoundError("Contact not found");

    const tag = await prisma.tag.findFirst({ where: { id: tagId } });
    if (!tag) throw new NotFoundError("Tag not found");

    await prisma.contactTag.deleteMany({ where: { contactId, tagId } });

    await logActivity(
      orgId,
      contactId,
      "contact.tag_removed",
      `Tag "${tag.name}" was removed`,
      actorId,
      { tagId, tagName: tag.name }
    );
  });
}

// ── Notes ───────────────────────────────────────────────────────────────────

/**
 * Adds a note to a contact and logs the activity.
 */
export async function addNote(
  orgId: string,
  contactId: string,
  content: string,
  actorId: string
) {
  return withOrgContext(orgId, async () => {
    const existing = await prisma.contact.findFirst({ where: { id: contactId } });
    if (!existing) throw new NotFoundError("Contact not found");

    const note = await prisma.note.create({
      data: {
        organizationId: orgId,
        contactId,
        content,
        authorId: actorId,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    await logActivity(
      orgId,
      contactId,
      "contact.note_added",
      "A note was added",
      actorId
    );

    return note;
  });
}

/**
 * Returns paginated notes for a contact.
 */
export async function getNotes(
  orgId: string,
  contactId: string,
  opts: { page?: number; limit?: number } = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  return withOrgContext(orgId, async () => {
    const existing = await prisma.contact.findFirst({ where: { id: contactId } });
    if (!existing) throw new NotFoundError("Contact not found");

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where: { contactId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.note.count({ where: { contactId } }),
    ]);

    return { notes, meta: { page, limit, total } };
  });
}

// ── Activity ─────────────────────────────────────────────────────────────────

/**
 * Returns paginated activity timeline for a contact.
 */
export async function getActivity(
  orgId: string,
  contactId: string,
  opts: { page?: number; limit?: number } = {}
) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  return withOrgContext(orgId, async () => {
    const existing = await prisma.contact.findFirst({ where: { id: contactId } });
    if (!existing) throw new NotFoundError("Contact not found");

    const [activity, total] = await Promise.all([
      prisma.contactActivity.findMany({
        where: { contactId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.contactActivity.count({ where: { contactId } }),
    ]);

    return { activity, meta: { page, limit, total } };
  });
}

// ── Import / Export ──────────────────────────────────────────────────────────

/**
 * Imports contacts from a parsed CSV row array.
 * Upserts by email (create if no email match, update if email exists).
 * Returns a summary of created, updated, skipped, and errored rows.
 */
export async function importContacts(
  orgId: string,
  rows: ImportRow[],
  actorId: string
): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      if (!row.firstName || !row.lastName) {
        result.errors.push({ row: i + 1, message: "Missing firstName or lastName" });
        result.skipped++;
        continue;
      }

      if (row.email) {
        // Upsert by email within org context
        const existing = await withOrgContext(orgId, () =>
          prisma.contact.findFirst({
            where: { email: row.email },
          })
        );

        if (existing) {
          await withOrgContext(orgId, () =>
            prisma.contact.update({
              where: { id: existing.id },
              data: {
                firstName: row.firstName,
                lastName: row.lastName,
                phone: row.phone ?? existing.phone,
                type: (row.type as "DONOR") ?? existing.type,
              },
            })
          );
          await withOrgContext(orgId, () =>
            logActivity(
              orgId,
              existing.id,
              "contact.updated",
              `Contact updated via CSV import`,
              actorId
            )
          );
          result.updated++;
        } else {
          const created = await withOrgContext(orgId, () =>
            prisma.contact.create({
              data: {
                organizationId: orgId,
                firstName: row.firstName,
                lastName: row.lastName,
                email: row.email || null,
                phone: row.phone ?? null,
                type: (row.type as "DONOR") ?? "DONOR",
              },
            })
          );
          await withOrgContext(orgId, () =>
            logActivity(
              orgId,
              created.id,
              "contact.created",
              `Contact created via CSV import`,
              actorId
            )
          );
          result.created++;
        }
      } else {
        // No email — always create
        const created = await withOrgContext(orgId, () =>
          prisma.contact.create({
            data: {
              organizationId: orgId,
              firstName: row.firstName,
              lastName: row.lastName,
              phone: row.phone ?? null,
              type: (row.type as "DONOR") ?? "DONOR",
            },
          })
        );
        await withOrgContext(orgId, () =>
          logActivity(
            orgId,
            created.id,
            "contact.created",
            `Contact created via CSV import`,
            actorId
          )
        );
        result.created++;
      }
    } catch (err) {
      result.errors.push({
        row: i + 1,
        message: err instanceof Error ? err.message : "Unknown error",
      });
      result.skipped++;
    }
  }

  return result;
}

/**
 * Exports all contacts for an org as a CSV string.
 */
export async function exportContacts(orgId: string): Promise<string> {
  return withOrgContext(orgId, async () => {
    const contacts = await prisma.contact.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        type: true,
        status: true,
        address: true,
        city: true,
        country: true,
        lifetimeValue: true,
        lastDonationAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return Papa.unparse(
      contacts.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email ?? "",
        phone: c.phone ?? "",
        type: c.type,
        status: c.status,
        address: c.address ?? "",
        city: c.city ?? "",
        country: c.country ?? "",
        lifetimeValue: c.lifetimeValue,
        lastDonationAt: c.lastDonationAt?.toISOString() ?? "",
        createdAt: c.createdAt.toISOString(),
      }))
    );
  });
}

// ── Household ────────────────────────────────────────────────────────────────

/**
 * Links a contact to a household head contact.
 */
export async function linkHousehold(
  orgId: string,
  contactId: string,
  householdHeadId: string
) {
  return withOrgContext(orgId, async () => {
    const contact = await prisma.contact.findFirst({ where: { id: contactId } });
    if (!contact) throw new NotFoundError("Contact not found");

    const head = await prisma.contact.findFirst({ where: { id: householdHeadId } });
    if (!head) throw new NotFoundError("Household head contact not found");

    return prisma.contact.update({
      where: { id: contactId },
      data: { householdId: householdHeadId },
    });
  });
}

// ── Segments ─────────────────────────────────────────────────────────────────

/**
 * Builds a Prisma WHERE clause from an array of segment filter conditions.
 */
function buildSegmentWhere(filters: SegmentFilter[]): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  for (const filter of filters) {
    const { field, operator, value } = filter;

    switch (field) {
      case "type":
        if (operator === "eq") where.type = value;
        else if (operator === "neq") where.type = { not: value };
        else if (operator === "in") where.type = { in: value as string[] };
        break;

      case "status":
        if (operator === "eq") where.status = value;
        else if (operator === "neq") where.status = { not: value };
        break;

      case "lifetimeValue":
        if (operator === "gt") where.lifetimeValue = { gt: Number(value) };
        else if (operator === "lt") where.lifetimeValue = { lt: Number(value) };
        else if (operator === "eq") where.lifetimeValue = Number(value);
        break;

      case "lastDonationAt":
        if (operator === "gt") where.lastDonationAt = { gt: new Date(String(value)) };
        else if (operator === "lt") where.lastDonationAt = { lt: new Date(String(value)) };
        break;

      case "country":
        if (operator === "eq") where.country = value;
        else if (operator === "contains")
          where.country = { contains: String(value), mode: "insensitive" };
        break;

      case "tag":
        if (operator === "in") {
          where.contactTags = {
            some: {
              tag: { name: { in: value as string[] } },
            },
          };
        }
        break;
    }
  }

  return where;
}

/**
 * Previews how many contacts match a given filter set and returns a sample.
 */
export async function previewSegment(
  orgId: string,
  filters: SegmentFilter[]
): Promise<SegmentPreviewResult> {
  return withOrgContext(orgId, async () => {
    const where = buildSegmentWhere(filters);

    const [count, sample] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          type: true,
        },
      }),
    ]);

    return { count, sample };
  });
}

/**
 * Evaluates a saved segment and returns the full list of matching contact IDs.
 * Used by Inngest functions for email sending.
 */
export async function evaluateSegment(
  orgId: string,
  segmentId: string
): Promise<string[]> {
  return withOrgContext(orgId, async () => {
    const segment = await prisma.segment.findFirst({ where: { id: segmentId } });
    if (!segment) throw new NotFoundError("Segment not found");

    const filters = segment.filters as SegmentFilter[];
    const where = buildSegmentWhere(filters);

    const contacts = await prisma.contact.findMany({
      where,
      select: { id: true },
    });

    return contacts.map((c) => c.id);
  });
}

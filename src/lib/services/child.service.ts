/**
 * Child management service for ZedImpact sponsorship domain.
 * Provides CRUD operations for children and their sub-records (updates, documents, health).
 * All operations are org-scoped via AsyncLocalStorage context.
 */
import { prisma } from "@/lib/db";
import { withOrgContext } from "@/lib/org-context";
import { NotFoundError } from "@/lib/org-auth";
import type {
  CreateChildInput,
  UpdateChildInput,
  CreateChildUpdateInput,
  CreateChildDocumentInput,
  CreateHealthRecordInput,
} from "@/lib/validations/sponsorship";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ChildListOptions {
  page?: number;
  limit?: number;
  search?: string;
  programId?: string;
  schoolId?: string;
  isAvailable?: boolean;
}

export interface ChildListResult {
  children: ChildSummary[];
  meta: { page: number; limit: number; total: number };
}

export interface ChildSummary {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  gender: string | null;
  profileImageUrl: string | null;
  isAvailable: boolean;
  createdAt: Date;
  program: { id: string; name: string } | null;
  school: { id: string; name: string } | null;
  _count: { sponsorships: number };
}

// ── List ───────────────────────────────────────────────────────────────────────

/**
 * Lists children with pagination and optional filters.
 *
 * @param orgId - Organization ID
 * @param options - Filter and pagination options
 */
export async function listChildren(
  orgId: string,
  options: ChildListOptions
): Promise<ChildListResult> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (options.search) {
    const search = options.search.trim();
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (options.programId) where.programId = options.programId;
  if (options.schoolId) where.schoolId = options.schoolId;
  if (options.isAvailable !== undefined) where.isAvailable = options.isAvailable;

  const [children, total] = await withOrgContext(orgId, () =>
    Promise.all([
      prisma.child.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
          profileImageUrl: true,
          isAvailable: true,
          createdAt: true,
          program: { select: { id: true, name: true } },
          school: { select: { id: true, name: true } },
          _count: { select: { sponsorships: true } },
        },
      }),
      prisma.child.count({ where }),
    ])
  );

  return {
    children: children as ChildSummary[],
    meta: { page, limit, total },
  };
}

// ── Get detail ─────────────────────────────────────────────────────────────────

/**
 * Returns a child's full profile including all sub-records and relations.
 *
 * @param orgId - Organization ID
 * @param childId - Child record ID
 */
export async function getChild(orgId: string, childId: string) {
  const child = await withOrgContext(orgId, () =>
    prisma.child.findUnique({
      where: { id: childId },
      include: {
        program: true,
        school: true,
        sponsorships: {
          where: { status: "ACTIVE" },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        childUpdates: { orderBy: { createdAt: "desc" }, take: 20 },
        childDocuments: { orderBy: { uploadedAt: "desc" } },
        healthRecords: { orderBy: { recordedAt: "desc" } },
        progress: {
          orderBy: { submittedAt: "desc" },
          include: { term: true, teacherProfile: true },
        },
      },
    })
  );

  if (!child) {
    throw new NotFoundError(`Child ${childId} not found`);
  }

  return child;
}

// ── Create ─────────────────────────────────────────────────────────────────────

/**
 * Creates a new child record.
 *
 * @param orgId - Organization ID
 * @param data - Validated child input
 */
export async function createChild(orgId: string, data: CreateChildInput) {
  return withOrgContext(orgId, () =>
    prisma.child.create({
      data: {
        organizationId: orgId,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        bio: data.bio,
        profileImageUrl: data.profileImageUrl,
        programId: data.programId,
        schoolId: data.schoolId,
        isAvailable: data.isAvailable ?? true,
      },
    })
  );
}

// ── Update ─────────────────────────────────────────────────────────────────────

/**
 * Partially updates a child record.
 *
 * @param orgId - Organization ID
 * @param childId - Child record ID
 * @param data - Fields to update
 */
export async function updateChild(
  orgId: string,
  childId: string,
  data: UpdateChildInput
) {
  await assertChildExists(orgId, childId);

  return withOrgContext(orgId, () =>
    prisma.child.update({
      where: { id: childId },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.dateOfBirth !== undefined && {
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.profileImageUrl !== undefined && {
          profileImageUrl: data.profileImageUrl,
        }),
        ...(data.programId !== undefined && { programId: data.programId }),
        ...(data.schoolId !== undefined && { schoolId: data.schoolId }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
      },
    })
  );
}

// ── Delete ─────────────────────────────────────────────────────────────────────

/**
 * Deletes a child record. Blocked if an active sponsorship exists.
 *
 * @param orgId - Organization ID
 * @param childId - Child record ID
 */
export async function deleteChild(orgId: string, childId: string) {
  const child = await withOrgContext(orgId, () =>
    prisma.child.findUnique({
      where: { id: childId },
      include: {
        _count: { select: { sponsorships: true } },
      },
    })
  );

  if (!child) {
    throw new NotFoundError(`Child ${childId} not found`);
  }

  const activeCount = await withOrgContext(orgId, () =>
    prisma.sponsorship.count({
      where: { childId, status: { in: ["ACTIVE", "PAUSED"] } },
    })
  );

  if (activeCount > 0) {
    throw new Error("Cannot delete a child with an active or paused sponsorship");
  }

  await withOrgContext(orgId, () =>
    prisma.child.delete({ where: { id: childId } })
  );
}

// ── Sub-records ────────────────────────────────────────────────────────────────

/**
 * Adds an update/post to a child's timeline.
 */
export async function addChildUpdate(
  orgId: string,
  childId: string,
  updatedBy: string,
  data: CreateChildUpdateInput
) {
  await assertChildExists(orgId, childId);

  return withOrgContext(orgId, () =>
    prisma.childUpdate.create({
      data: {
        organizationId: orgId,
        childId,
        type: data.type ?? "GENERAL",
        title: data.title,
        body: data.body,
        imageUrl: data.imageUrl,
        updatedBy,
      },
    })
  );
}

/**
 * Attaches a document to a child's record.
 */
export async function addChildDocument(
  orgId: string,
  childId: string,
  uploadedBy: string,
  data: CreateChildDocumentInput
) {
  await assertChildExists(orgId, childId);

  return withOrgContext(orgId, () =>
    prisma.childDocument.create({
      data: {
        organizationId: orgId,
        childId,
        type: data.type ?? "OTHER",
        name: data.name,
        url: data.url,
        uploadedBy,
      },
    })
  );
}

/**
 * Adds a health record to a child.
 */
export async function addHealthRecord(
  orgId: string,
  childId: string,
  createdBy: string,
  data: CreateHealthRecordInput
) {
  await assertChildExists(orgId, childId);

  return withOrgContext(orgId, () =>
    prisma.childHealthRecord.create({
      data: {
        organizationId: orgId,
        childId,
        recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
        weight: data.weight,
        height: data.height,
        notes: data.notes,
        createdBy,
      },
    })
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function assertChildExists(orgId: string, childId: string) {
  const child = await withOrgContext(orgId, () =>
    prisma.child.findUnique({ where: { id: childId }, select: { id: true } })
  );
  if (!child) {
    throw new NotFoundError(`Child ${childId} not found`);
  }
}

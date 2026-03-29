/**
 * Donation form CRUD service for ZedImpact.
 * Forms store their field definitions as JSON for flexible rendering.
 */
import { prisma } from "@/lib/db";
import { withOrgContext } from "@/lib/org-context";
import type { FormField } from "@/lib/validations/donation";

export interface CreateFormData {
  name: string;
  slug: string;
  fields: FormField[];
  isPublished?: boolean;
  campaignId?: string | null;
}

export type UpdateFormData = Partial<CreateFormData>;

/**
 * Returns all donation forms for the given org.
 *
 * @param orgId - Organization ID
 */
export async function listForms(orgId: string) {
  return withOrgContext(orgId, () =>
    prisma.donationForm.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        isPublished: true,
        campaignId: true,
        createdAt: true,
        updatedAt: true,
        campaign: { select: { id: true, name: true } },
      },
    })
  );
}

/**
 * Returns a single form by its database ID.
 *
 * @param orgId - Organization ID
 * @param formId - DonationForm ID
 */
export async function getFormById(orgId: string, formId: string) {
  return withOrgContext(orgId, () =>
    prisma.donationForm.findUnique({
      where: { id: formId },
      include: { campaign: { select: { id: true, name: true } } },
    })
  );
}

/**
 * Returns a published form by slug. Used by public-facing routes.
 * Returns null if the form is unpublished.
 *
 * @param orgId - Organization ID
 * @param slug - Form slug
 * @param requirePublished - If true, only returns published forms (default: true)
 */
export async function getFormBySlug(
  orgId: string,
  slug: string,
  requirePublished = true
) {
  return withOrgContext(orgId, () =>
    prisma.donationForm.findFirst({
      where: {
        slug,
        ...(requirePublished && { isPublished: true }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        fields: true,
        isPublished: true,
        campaignId: true,
        campaign: { select: { id: true, name: true, slug: true } },
      },
    })
  );
}

/**
 * Creates a new donation form. Validates slug uniqueness.
 *
 * @param orgId - Organization ID
 * @param data - Form creation data
 */
export async function createForm(orgId: string, data: CreateFormData) {
  const existing = await prisma.donationForm.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`Form slug "${data.slug}" is already taken`);
  }

  return withOrgContext(orgId, () =>
    prisma.donationForm.create({
      data: {
        organizationId: orgId,
        name: data.name,
        slug: data.slug,
        fields: data.fields as unknown as Parameters<typeof prisma.donationForm.create>[0]["data"]["fields"],
        isPublished: data.isPublished ?? false,
        campaignId: data.campaignId ?? null,
      },
    })
  );
}

/**
 * Partially updates a donation form, including field reordering from DnD.
 * The fields array is saved wholesale — the caller sends the reordered array.
 *
 * @param orgId - Organization ID
 * @param formId - DonationForm ID
 * @param data - Fields to update
 */
export async function updateForm(
  orgId: string,
  formId: string,
  data: UpdateFormData
) {
  // If slug is changing, check uniqueness
  if (data.slug) {
    const existing = await prisma.donationForm.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });
    if (existing && existing.id !== formId) {
      throw new Error(`Form slug "${data.slug}" is already taken`);
    }
  }

  return withOrgContext(orgId, () =>
    prisma.donationForm.update({
      where: { id: formId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.fields !== undefined && {
          fields: data.fields as unknown as Parameters<typeof prisma.donationForm.update>[0]["data"]["fields"],
        }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
        ...(data.campaignId !== undefined && { campaignId: data.campaignId }),
      },
    })
  );
}

/**
 * Deletes a donation form.
 *
 * @param orgId - Organization ID
 * @param formId - DonationForm ID
 */
export async function deleteForm(orgId: string, formId: string) {
  return withOrgContext(orgId, () =>
    prisma.donationForm.delete({ where: { id: formId } })
  );
}

/**
 * Zod v4 validation schemas for the sponsorship domain.
 * Covers children, programs, schools, sponsorships, letters, progress, and teachers.
 */
import { z } from "zod";

// ── Child ──────────────────────────────────────────────────────────────────────

export const createChildSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  bio: z.string().max(2000).optional(),
  profileImageUrl: z.string().url().optional(),
  programId: z.string().optional(),
  schoolId: z.string().optional(),
  isAvailable: z.boolean().optional().default(true),
});

export const updateChildSchema = createChildSchema.partial();

export type CreateChildInput = z.infer<typeof createChildSchema>;
export type UpdateChildInput = z.infer<typeof updateChildSchema>;

// ── Program ───────────────────────────────────────────────────────────────────

export const createProgramSchema = z.object({
  name: z.string().min(1, "Program name is required").max(200),
  description: z.string().max(2000).optional(),
  goalAmount: z.number().positive().optional(),
});

export const updateProgramSchema = createProgramSchema.partial();

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;

// ── School ────────────────────────────────────────────────────────────────────

export const createSchoolSchema = z.object({
  name: z.string().min(1, "School name is required").max(200),
  type: z.enum(["PRIMARY", "SECONDARY", "TERTIARY", "VOCATIONAL"]).default("PRIMARY"),
  location: z.string().max(500).optional(),
});

export const updateSchoolSchema = createSchoolSchema.partial();

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;

// ── Sponsorship ───────────────────────────────────────────────────────────────

export const createSponsorshipSchema = z.object({
  childId: z.string().min(1, "Child ID is required"),
  stripePaymentMethodId: z.string().min(1, "Payment method is required"),
  monthlyAmount: z.number().positive("Monthly amount must be positive"),
});

export const updateSponsorshipStatusSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "CANCELLED"]),
});

export type CreateSponsorshipInput = z.infer<typeof createSponsorshipSchema>;
export type UpdateSponsorshipStatusInput = z.infer<typeof updateSponsorshipStatusSchema>;

// ── Letter ────────────────────────────────────────────────────────────────────

export const createLetterSchema = z.object({
  direction: z.enum(["SPONSOR_TO_CHILD", "CHILD_TO_SPONSOR"]),
  subject: z.string().min(1, "Subject is required").max(200),
  body: z.string().min(1, "Body is required").max(10000),
  attachmentUrl: z.string().url().optional(),
});

export const updateLetterStatusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "DELIVERED"]),
  moderatedBy: z.string().optional(),
});

export type CreateLetterInput = z.infer<typeof createLetterSchema>;
export type UpdateLetterStatusInput = z.infer<typeof updateLetterStatusSchema>;

// ── Child sub-records ─────────────────────────────────────────────────────────

export const createChildUpdateSchema = z.object({
  type: z.enum(["GENERAL", "ACADEMIC", "HEALTH", "PHOTO", "LETTER"]).default("GENERAL"),
  title: z.string().min(1, "Title is required").max(200),
  body: z.string().min(1, "Body is required").max(5000),
  imageUrl: z.string().url().optional(),
});

export const createChildDocumentSchema = z.object({
  type: z
    .enum(["BIRTH_CERTIFICATE", "PHOTO", "SCHOOL_REPORT", "MEDICAL", "OTHER"])
    .default("OTHER"),
  name: z.string().min(1, "Document name is required").max(200),
  url: z.string().url("Document URL is required"),
});

export const createHealthRecordSchema = z.object({
  recordedAt: z.string().optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateChildUpdateInput = z.infer<typeof createChildUpdateSchema>;
export type CreateChildDocumentInput = z.infer<typeof createChildDocumentSchema>;
export type CreateHealthRecordInput = z.infer<typeof createHealthRecordSchema>;

// ── Progress ──────────────────────────────────────────────────────────────────

export const createStudentProgressSchema = z.object({
  childId: z.string().min(1, "Child ID is required"),
  termId: z.string().min(1, "Term ID is required"),
  subjects: z.record(z.string(), z.unknown()),
  attendance: z.number().int().min(0).max(100).optional(),
  grade: z.string().max(10).optional(),
  notes: z.string().max(2000).optional(),
});

export const bulkStudentProgressSchema = z.object({
  termId: z.string().min(1, "Term ID is required"),
  records: z.array(
    z.object({
      childId: z.string(),
      subjects: z.record(z.string(), z.unknown()),
      attendance: z.number().int().min(0).max(100).optional(),
      grade: z.string().max(10).optional(),
      notes: z.string().max(2000).optional(),
    })
  ),
});

export type CreateStudentProgressInput = z.infer<typeof createStudentProgressSchema>;
export type BulkStudentProgressInput = z.infer<typeof bulkStudentProgressSchema>;

// ── Teacher ───────────────────────────────────────────────────────────────────

export const createTeacherProfileSchema = z.object({
  schoolId: z.string().optional(),
  subjects: z.array(z.string()).min(1, "At least one subject is required"),
  bio: z.string().max(2000).optional(),
});

export type CreateTeacherProfileInput = z.infer<typeof createTeacherProfileSchema>;

// ── Common list query ─────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

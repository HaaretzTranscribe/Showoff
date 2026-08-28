import { z } from "zod";

/**
 * Name normalization for attendance de-duplication (spec section 7):
 * trim, collapse repeated whitespace, compare case-insensitively.
 * Deliberately simple — this only decides "is this the same student
 * retyping their name", not identity verification.
 *
 * Mirrored inline in supabase/functions/attendance-submit/index.ts,
 * which is deployed by pasting into the Supabase dashboard editor and
 * so can't import this file directly. Keep both copies in sync.
 */
export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

/** At least one letter (any script) and a sane length — not identity verification. */
export function isPlausibleName(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.length >= 2 && trimmed.length <= 100 && /\p{L}/u.test(trimmed);
}

export function normalizeAttendanceCode(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "name_too_short")
  .max(100, "name_too_long")
  .refine((v) => /\p{L}/u.test(v), "name_needs_letter");

export const attendanceCodeSchema = z.string().trim().min(1).max(32);

export const sessionSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, "invalid_session_slug");

export const attendanceSubmitSchema = z.object({
  sessionSlug: sessionSlugSchema,
  fullName: fullNameSchema,
  attendanceCode: attendanceCodeSchema,
});

export const courseNameSchema = z.string().trim().min(1).max(200);

export const sessionTitleSchema = z.string().trim().min(1).max(200);

export const pollsliveJoinUrlSchema = z
  .string()
  .trim()
  .url("invalid_url");

export const createSessionSchema = z.object({
  courseId: z.string().uuid(),
  title: sessionTitleSchema,
  sessionDate: z.string().min(1),
  attendanceCode: attendanceCodeSchema,
  pollsliveJoinUrl: pollsliveJoinUrlSchema,
});

export type AttendanceSubmitInput = z.infer<typeof attendanceSubmitSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

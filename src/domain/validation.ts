import { z } from "zod";

export const attendanceCodeSchema = z.string().trim().min(1).max(32);

export const sessionSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, "invalid_session_slug");

export const courseNameSchema = z.string().trim().min(1).max(200);

export const sessionTitleSchema = z.string().trim().min(1).max(200);

export const googleFormUrlSchema = z.string().trim().url("invalid_url");

export const createSessionSchema = z.object({
  courseId: z.string().uuid(),
  title: sessionTitleSchema,
  sessionDate: z.string().min(1),
  attendanceCode: attendanceCodeSchema,
  googleFormUrl: googleFormUrlSchema,
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

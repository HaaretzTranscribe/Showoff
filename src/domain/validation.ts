import { z } from "zod";

/**
 * Shared Zod schemas. These are the server-side source of truth for
 * validation (spec section 15: "Server validation חוזרת על min/max/options —
 * לא לסמוך רק על frontend") — the same schemas run in the browser for
 * instant feedback and in Edge Functions before writing to Postgres.
 */

export const bilingualTextSchema = z
  .object({
    he: z.string().trim().max(500),
    en: z.string().trim().max(500),
  })
  .refine((v) => v.he.length > 0 || v.en.length > 0, {
    message: "at least one of he/en must be non-empty",
  });

export const rosterPolicySchema = z.enum(["required", "optional", "off"]);
export const attendanceCodePolicySchema = z.enum(["static", "rotating"]);

export const lessonConfigSchema = z.object({
  identityFieldLabel: bilingualTextSchema,
  rosterPolicy: rosterPolicySchema,
  attendanceCodePolicy: attendanceCodePolicySchema,
  rotatingCodeTtlSeconds: z.number().int().min(60).max(3600).default(600),
  lateJoinUntilMinutes: z.number().int().min(0).max(600).nullable().default(null),
  editUntilLock: z.boolean().default(true),
});

export const createLessonSchema = z.object({
  courseId: z.string().uuid(),
  title: bilingualTextSchema,
  plannedAt: z.string().datetime().nullable().default(null),
  internalNotes: z.string().max(2000).nullable().default(null),
  config: lessonConfigSchema,
});

export const questionTypeSchema = z.enum([
  "single_choice",
  "multiple_choice",
  "number",
  "scale",
  "text",
  "yes_no",
  "datetime",
  "hidden_meta",
]);

const questionConfigBaseSchema = z.object({
  required: z.boolean().default(false),
});

export const choiceQuestionConfigSchema = questionConfigBaseSchema.extend({
  shuffle: z.boolean().optional(),
  allowOther: z.boolean().optional(),
  minSelections: z.number().int().min(0).optional(),
  maxSelections: z.number().int().min(1).optional(),
});

export const numberQuestionConfigSchema = questionConfigBaseSchema.extend({
  min: z.number().optional(),
  max: z.number().optional(),
  integerOnly: z.boolean().optional(),
  unitLabel: bilingualTextSchema.optional(),
});

export const scaleQuestionConfigSchema = questionConfigBaseSchema.extend({
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  minLabel: bilingualTextSchema.optional(),
  maxLabel: bilingualTextSchema.optional(),
});

export const textQuestionConfigSchema = questionConfigBaseSchema.extend({
  long: z.boolean().optional(),
  maxLength: z.number().int().min(1).max(5000).optional(),
});

/** stable_key must survive prompt rewrites; Scene bindings reference it, never a label. */
export const stableKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{1,63}$/, "stable_key must be snake_case, start with a letter, 2-64 chars");

export const createQuestionSchema = z
  .object({
    lessonId: z.string().uuid(),
    stableKey: stableKeySchema,
    type: questionTypeSchema,
    prompt: bilingualTextSchema,
    orderIndex: z.number().int().min(0),
    config: z.record(z.unknown()),
  })
  .superRefine((val, ctx) => {
    const configSchemaByType: Record<string, z.ZodTypeAny> = {
      single_choice: choiceQuestionConfigSchema,
      multiple_choice: choiceQuestionConfigSchema,
      number: numberQuestionConfigSchema,
      scale: scaleQuestionConfigSchema,
      text: textQuestionConfigSchema,
      yes_no: questionConfigBaseSchema,
      datetime: questionConfigBaseSchema,
      hidden_meta: questionConfigBaseSchema,
    };
    const schema = configSchemaByType[val.type];
    const result = schema.safeParse(val.config);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ["config", ...issue.path] });
      }
    }
  });

export const questionOptionSchema = z.object({
  questionId: z.string().uuid(),
  value: z.string().min(1).max(120),
  label: bilingualTextSchema,
  orderIndex: z.number().int().min(0),
});

// --- Join API (spec section 14) ---

export const joinRequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  lessonJoinSlug: z.string().min(1).max(64).optional(),
  studentIdentifier: z.string().min(1).max(64),
  attendanceCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4,8}$/, "invalid attendance code format"),
  clientFingerprint: z.string().max(256).optional(),
});

export const joinRequestSchemaWithTarget = joinRequestSchema.refine(
  (v) => Boolean(v.sessionId || v.lessonJoinSlug),
  { message: "either sessionId or lessonJoinSlug is required" }
);

// --- Response submit (spec section 15) ---

export const responseValueSchema = z.union([
  z.string().max(5000),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
]);

export const submitResponseSchema = z.object({
  classSessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  valueJson: responseValueSchema,
  status: z.enum(["draft", "submitted"]).default("submitted"),
});

// --- Scene config (spec sections 7 & 24) ---

export const chartTypeSchema = z.enum([
  "bar",
  "stacked_bar",
  "stacked_bar_100",
  "histogram",
  "box_plot",
  "dot_strip",
  "scatter",
  "bubble_scatter",
  "line",
  "donut",
  "table",
  "big_number",
  "word_cloud",
  "response_feed",
]);

export const sceneFilterSchema = z.object({
  questionStableKey: stableKeySchema,
  op: z.enum(["eq", "neq", "in", "not_in", "gte", "lte", "between"]),
  value: z.unknown(),
});

/** Versioned so future shape changes don't silently corrupt instructor-authored Scene JSON. */
export const sceneConfigSchema = z.object({
  schemaVersion: z.literal(1),
  name: bilingualTextSchema,
  chartType: chartTypeSchema,
  bindings: z.object({
    x: stableKeySchema.optional(),
    y: stableKeySchema.optional(),
    color: stableKeySchema.optional(),
    size: stableKeySchema.optional(),
  }),
  aggregation: z.enum(["none", "count", "mean", "median", "sum", "percent"]),
  filters: z.array(sceneFilterSchema).default([]),
  sort: z
    .object({
      by: z.enum(["value_desc", "category", "custom"]),
      customOrder: z.array(z.string()).optional(),
    })
    .optional(),
  axis: z
    .object({
      zeroBaseline: z.boolean().optional(),
      domain: z.union([z.literal("auto"), z.tuple([z.number(), z.number()])]).optional(),
      labels: z.boolean().optional(),
      units: z.string().optional(),
    })
    .optional(),
  outlierControls: z.object({
    enabled: z.boolean(),
    manual: z.boolean(),
    iqr: z.boolean(),
    percentile: z.boolean(),
  }),
  display: z.object({
    title: bilingualTextSchema.optional(),
    subtitle: bilingualTextSchema.optional(),
    showSampleSize: z.boolean(),
    legend: z.boolean(),
    annotations: z.array(z.string()).optional(),
  }),
  transition: z.enum(["morph", "fade", "instant"]),
  privacy: z.object({
    minGroupSize: z.number().int().min(0).max(50),
  }),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type JoinRequestInput = z.infer<typeof joinRequestSchema>;
export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
export type SceneConfigInput = z.infer<typeof sceneConfigSchema>;

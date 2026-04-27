import { z } from "zod";

/**
 * Legacy-aligned lesson validation
 * Existing lesson document shape:
 * {
 *   _id: ObjectId,
 *   lesson_id: "l1",
 *   moduleId: "m1",          // string legacy module id
 *   title: "Lesson Title",
 *   videoUrl: "https://..."
 * }
 */

const objectIdRegex = /^[a-f\d]{24}$/i;
const legacyModuleIdRegex = /^m\d+$/i;
const legacyLessonIdRegex = /^l\d+$/i;

/**
 * Helpers
 */
const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text.length ? text : undefined;
};

const optionalUrlString = z.preprocess(
  normalizeOptionalString,
  z.string().url("Must be a valid URL").max(2000, "URL is too long").optional(),
);

const lessonTitleSchema = z
  .string({
    required_error: "Lesson title is required",
    invalid_type_error: "Lesson title must be a string",
  })
  .trim()
  .min(2, "Lesson title must be at least 2 characters")
  .max(200, "Lesson title cannot exceed 200 characters");

const moduleIdSchema = z
  .string({
    required_error: "moduleId is required",
    invalid_type_error: "moduleId must be a string",
  })
  .trim()
  .min(1, "moduleId is required")
  .regex(
    legacyModuleIdRegex,
    "moduleId must be a legacy module id like m1, m2, ...",
  );

const legacyLessonIdSchema = z
  .string({
    invalid_type_error: "lesson_id must be a string",
  })
  .trim()
  .min(1, "lesson_id cannot be empty")
  .regex(
    legacyLessonIdRegex,
    "lesson_id must be a legacy lesson id like l1, l2, ...",
  );

const lessonObjectIdSchema = z
  .string({
    required_error: "lessonId is required",
    invalid_type_error: "lessonId must be a string",
  })
  .trim()
  .regex(objectIdRegex, "Invalid MongoDB ObjectId for lessonId");

const positiveIntString = z
  .string()
  .trim()
  .optional()
  .transform((val) => {
    if (!val) return undefined;
    const num = Number(val);
    return Number.isFinite(num) ? Math.trunc(num) : NaN;
  })
  .refine(
    (val) => val === undefined || (Number.isInteger(val) && val > 0),
    "Must be a positive integer",
  );

/**
 * Create lesson:
 * Accepts legacy and frontend-friendly aliases:
 * - title or lessonTitle
 * - lesson_id or lessonId (optional; generated if missing)
 * - moduleId (required; legacy string, e.g., m1)
 * - videoUrl or videoURL (optional)
 */
export const createLessonSchema = {
  body: z
    .object({
      title: lessonTitleSchema.optional(),
      lessonTitle: lessonTitleSchema.optional(),

      moduleId: moduleIdSchema,

      lesson_id: legacyLessonIdSchema.optional(),
      lessonId: legacyLessonIdSchema.optional(),

      videoUrl: optionalUrlString,
      videoURL: optionalUrlString,
    })
    .passthrough()
    .superRefine((body, ctx) => {
      const resolvedTitle = body.title ?? body.lessonTitle;
      if (!resolvedTitle) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["title"],
          message: "Either title or lessonTitle is required",
        });
      }

      if (body.lesson_id && body.lessonId && body.lesson_id !== body.lessonId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lesson_id"],
          message: "lesson_id and lessonId must match when both are provided",
        });
      }

      if (body.videoUrl && body.videoURL && body.videoUrl !== body.videoURL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["videoUrl"],
          message: "videoUrl and videoURL must match when both are provided",
        });
      }
    })
    .transform((body) => ({
      title: (body.title ?? body.lessonTitle).trim(),
      moduleId: body.moduleId.trim(),
      lesson_id: (body.lesson_id ?? body.lessonId)?.trim(),
      videoUrl: body.videoUrl ?? body.videoURL ?? "",
    })),
};

/**
 * Update lesson:
 * Supports partial updates.
 * At least one field must be provided.
 */
export const updateLessonSchema = {
  params: z
    .object({
      lessonId: lessonObjectIdSchema,
    })
    .strict(),
  body: z
    .object({
      title: lessonTitleSchema.optional(),
      lessonTitle: lessonTitleSchema.optional(),

      moduleId: moduleIdSchema.optional(),

      lesson_id: legacyLessonIdSchema.optional(),
      lessonId: legacyLessonIdSchema.optional(),

      videoUrl: optionalUrlString,
      videoURL: optionalUrlString,
    })
    .passthrough()
    .superRefine((body, ctx) => {
      if (Object.keys(body).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["body"],
          message: "At least one field is required to update a lesson",
        });
      }

      if (body.lesson_id && body.lessonId && body.lesson_id !== body.lessonId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lesson_id"],
          message: "lesson_id and lessonId must match when both are provided",
        });
      }

      if (body.videoUrl && body.videoURL && body.videoUrl !== body.videoURL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["videoUrl"],
          message: "videoUrl and videoURL must match when both are provided",
        });
      }
    })
    .transform((body) => {
      const out = {};

      if (body.title !== undefined || body.lessonTitle !== undefined) {
        out.title = (body.title ?? body.lessonTitle).trim();
      }

      if (body.moduleId !== undefined) out.moduleId = body.moduleId.trim();
      if (body.lesson_id !== undefined || body.lessonId !== undefined) {
        out.lesson_id = (body.lesson_id ?? body.lessonId).trim();
      }

      if (body.videoUrl !== undefined || body.videoURL !== undefined) {
        out.videoUrl = body.videoUrl ?? body.videoURL ?? "";
      }

      return out;
    }),
};

export const lessonIdParamSchema = {
  params: z
    .object({
      lessonId: lessonObjectIdSchema,
    })
    .strict(),
};

export const moduleIdParamSchema = {
  params: z
    .object({
      moduleId: moduleIdSchema,
    })
    .strict(),
};

export const lessonListQuerySchema = {
  query: z
    .object({
      page: positiveIntString,
      limit: positiveIntString,
      search: z.preprocess(
        normalizeOptionalString,
        z.string().max(120).optional(),
      ),
      moduleId: moduleIdSchema.optional(),
      sort: z.string().trim().max(100).optional().default("_id:asc"),
    })
    .passthrough(),
};

export const uploadLessonVideoSchema = {
  params: z
    .object({
      lessonId: lessonObjectIdSchema,
    })
    .strict(),
};

export default {
  createLessonSchema,
  updateLessonSchema,
  lessonIdParamSchema,
  moduleIdParamSchema,
  lessonListQuerySchema,
  uploadLessonVideoSchema,
};

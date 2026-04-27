import { z } from "zod";

/**
 * Module validators aligned to legacy collection shape:
 * {
 *   _id: "m1",
 *   courseId: "c1",
 *   title: "Arrays"
 * }
 */

const legacyCourseIdRegex = /^c\d+$/i;
const legacyModuleIdRegex = /^m\d+$/i;

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text.length ? text : undefined;
};

const moduleTitleSchema = z
  .string({
    required_error: "Module title is required",
    invalid_type_error: "Module title must be a string",
  })
  .trim()
  .min(2, "Module title must be at least 2 characters")
  .max(200, "Module title cannot exceed 200 characters")
  .transform((value) => value.replace(/\s+/g, " "));

const legacyCourseIdSchema = z
  .string({
    required_error: "courseId is required",
    invalid_type_error: "courseId must be a string",
  })
  .trim()
  .regex(
    legacyCourseIdRegex,
    "courseId must be a legacy course id like c1, c2, ...",
  );

const legacyModuleIdSchema = z
  .string({
    required_error: "moduleId is required",
    invalid_type_error: "moduleId must be a string",
  })
  .trim()
  .regex(
    legacyModuleIdRegex,
    "moduleId must be a legacy module id like m1, m2, ...",
  );

export const createModuleSchema = {
  body: z
    .object({
      // title alias support
      title: moduleTitleSchema.optional(),
      moduleTitle: moduleTitleSchema.optional(),

      // legacy relation id
      courseId: legacyCourseIdSchema,
      course_id: legacyCourseIdSchema.optional(),

      // optional explicit legacy module id
      _id: z
        .preprocess(
          normalizeOptionalString,
          z
            .string()
            .trim()
            .regex(
              legacyModuleIdRegex,
              "_id must be a legacy module id like m1, m2, ...",
            )
            .optional(),
        )
        .optional(),
      moduleId: z
        .preprocess(
          normalizeOptionalString,
          z
            .string()
            .trim()
            .regex(
              legacyModuleIdRegex,
              "moduleId must be a legacy module id like m1, m2, ...",
            )
            .optional(),
        )
        .optional(),
      id: z
        .preprocess(
          normalizeOptionalString,
          z
            .string()
            .trim()
            .regex(
              legacyModuleIdRegex,
              "id must be a legacy module id like m1, m2, ...",
            )
            .optional(),
        )
        .optional(),
    })
    .passthrough()
    .superRefine((body, ctx) => {
      const resolvedTitle = body.title ?? body.moduleTitle;
      if (!resolvedTitle) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["title"],
          message: "Either title or moduleTitle is required",
        });
      }

      if (
        body.course_id !== undefined &&
        body.course_id.trim() !== body.courseId.trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["course_id"],
          message: "course_id and courseId must match when both are provided",
        });
      }

      const ids = [body._id, body.moduleId, body.id].filter(Boolean);
      if (ids.length > 1 && new Set(ids).size > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["_id"],
          message:
            "_id, moduleId, and id must match when multiple are provided",
        });
      }
    })
    .transform((body) => ({
      title: (body.title ?? body.moduleTitle).trim().replace(/\s+/g, " "),
      courseId: body.courseId.trim(),
      _id: body._id ?? body.moduleId ?? body.id ?? undefined,
    })),
};

export const updateModuleSchema = {
  params: z
    .object({
      moduleId: legacyModuleIdSchema,
    })
    .strict(),
  body: z
    .object({
      // title alias support
      title: moduleTitleSchema.optional(),
      moduleTitle: moduleTitleSchema.optional(),

      // allow moving module to different course
      courseId: legacyCourseIdSchema.optional(),
      course_id: legacyCourseIdSchema.optional(),
    })
    .passthrough()
    .superRefine((body, ctx) => {
      if (Object.keys(body).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["body"],
          message: "At least one field is required to update the module",
        });
      }

      if (
        body.courseId !== undefined &&
        body.course_id !== undefined &&
        body.courseId.trim() !== body.course_id.trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["course_id"],
          message: "course_id and courseId must match when both are provided",
        });
      }
    })
    .transform((body) => {
      const out = {};

      if (body.title !== undefined || body.moduleTitle !== undefined) {
        out.title = (body.title ?? body.moduleTitle)
          .trim()
          .replace(/\s+/g, " ");
      }

      if (body.courseId !== undefined || body.course_id !== undefined) {
        out.courseId = (body.courseId ?? body.course_id).trim();
      }

      return out;
    }),
};

export const getModulesByCourseSchema = {
  params: z
    .object({
      courseId: legacyCourseIdSchema,
    })
    .strict(),
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
      search: z.preprocess(
        normalizeOptionalString,
        z.string().max(120).optional(),
      ),
      sort: z.string().trim().max(100).optional().default("_id:asc"),
    })
    .passthrough(),
};

export const moduleIdSchema = {
  params: z
    .object({
      moduleId: legacyModuleIdSchema,
    })
    .strict(),
};

export const deleteModuleSchema = moduleIdSchema;

export const listModulesQuerySchema = {
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
      search: z.preprocess(
        normalizeOptionalString,
        z.string().max(120).optional(),
      ),
      courseId: legacyCourseIdSchema.optional(),
      sort: z.string().trim().max(100).optional().default("_id:asc"),
    })
    .passthrough(),
};

export default {
  createModuleSchema,
  updateModuleSchema,
  getModulesByCourseSchema,
  moduleIdSchema,
  deleteModuleSchema,
  listModulesQuerySchema,
};

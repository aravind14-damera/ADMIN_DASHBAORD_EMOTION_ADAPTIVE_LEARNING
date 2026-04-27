import { z } from "zod";

/**
 * Course validators aligned to legacy collection shape:
 * {
 *   _id: "c1",
 *   title: "Data Structures"
 * }
 *
 * Supports title aliases:
 * - title
 * - courseTitle
 */

const legacyCourseIdRegex = /^c\d+$/i;

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text.length ? text : undefined;
};

const courseTitleSchema = z
  .string({
    required_error: "Course title is required",
    invalid_type_error: "Course title must be a string",
  })
  .trim()
  .min(2, "Course title must be at least 2 characters")
  .max(200, "Course title cannot exceed 200 characters")
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

export const createCourseSchema = {
  body: z
    .object({
      // title aliases
      title: courseTitleSchema.optional(),
      courseTitle: courseTitleSchema.optional(),

      // optional explicit legacy id
      _id: z
        .preprocess(
          normalizeOptionalString,
          z
            .string()
            .trim()
            .regex(
              legacyCourseIdRegex,
              "_id must be a legacy course id like c1, c2, ...",
            )
            .optional(),
        )
        .optional(),
      courseId: z
        .preprocess(
          normalizeOptionalString,
          z
            .string()
            .trim()
            .regex(
              legacyCourseIdRegex,
              "courseId must be a legacy course id like c1, c2, ...",
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
              legacyCourseIdRegex,
              "id must be a legacy course id like c1, c2, ...",
            )
            .optional(),
        )
        .optional(),
    })
    .passthrough()
    .superRefine((body, ctx) => {
      const resolvedTitle = body.title ?? body.courseTitle;
      if (!resolvedTitle) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["title"],
          message: "Either title or courseTitle is required",
        });
      }

      const ids = [body._id, body.courseId, body.id].filter(Boolean);
      if (ids.length > 1 && new Set(ids).size > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["_id"],
          message:
            "_id, courseId, and id must match when multiple are provided",
        });
      }
    })
    .transform((body) => ({
      ...body,
      title: (body.title ?? body.courseTitle).trim().replace(/\s+/g, " "),
      _id: body._id ?? body.courseId ?? body.id ?? undefined,
    })),
};

export const updateCourseSchema = {
  params: z
    .object({
      courseId: legacyCourseIdSchema,
    })
    .strict(),
  body: z
    .object({
      // title aliases
      title: courseTitleSchema.optional(),
      courseTitle: courseTitleSchema.optional(),
    })
    .passthrough()
    .superRefine((body, ctx) => {
      if (Object.keys(body).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["body"],
          message: "At least one field is required to update the course",
        });
      }
    })
    .transform((body) => {
      const out = { ...body };
      if (body.title !== undefined || body.courseTitle !== undefined) {
        out.title = (body.title ?? body.courseTitle)
          .trim()
          .replace(/\s+/g, " ");
      }
      return out;
    }),
};

export const getCourseByIdSchema = {
  params: z
    .object({
      courseId: legacyCourseIdSchema,
    })
    .strict(),
};

export const deleteCourseSchema = getCourseByIdSchema;

export const listCoursesSchema = {
  query: z
    .object({
      page: z.coerce
        .number()
        .int("page must be an integer")
        .min(1, "page must be at least 1")
        .default(1),

      limit: z.coerce
        .number()
        .int("limit must be an integer")
        .min(1, "limit must be at least 1")
        .max(500, "limit cannot be more than 500")
        .default(10),

      search: z
        .preprocess(normalizeOptionalString, z.string().max(120).optional())
        .optional(),

      sort: z
        .string()
        .trim()
        .max(100, "sort query is too long")
        .optional()
        .default("_id:asc"),
    })
    .passthrough(),
};

export default {
  createCourseSchema,
  updateCourseSchema,
  getCourseByIdSchema,
  deleteCourseSchema,
  listCoursesSchema,
};

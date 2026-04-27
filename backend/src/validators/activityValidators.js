import { z } from "zod";

/**
 * Shared helpers
 */
const objectIdRegex = /^[a-f\d]{24}$/i;

const objectId = z
  .string({
    required_error: "ID is required",
    invalid_type_error: "ID must be a string",
  })
  .trim()
  .regex(objectIdRegex, "Invalid MongoDB ObjectId");

const nonNegativeNumber = (label) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") return undefined;
      return Number(value);
    },
    z
      .number({
        invalid_type_error: `${label} must be a number`,
      })
      .min(0, `${label} cannot be negative`)
  );

const percentage = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return undefined;
    return Number(value);
  },
  z
    .number({
      invalid_type_error: "Progress percent must be a number",
    })
    .min(0, "Progress percent cannot be less than 0")
    .max(100, "Progress percent cannot be more than 100")
);

const dateLike = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d;
  },
  z.date({
    invalid_type_error: "Invalid date value",
  })
);

const normalizeString = (max = 255) =>
  z
    .string({
      invalid_type_error: "Must be a string",
    })
    .trim()
    .max(max, `Must be at most ${max} characters`);

/**
 * Nested schemas
 */
const activityByDateItemSchema = z.object({
  date: dateLike,
  learningTimeMinutes: nonNegativeNumber("Learning time minutes").optional().default(0),
  lessonsWatched: nonNegativeNumber("Lessons watched").optional().default(0),
});

const topicProgressItemSchema = z.object({
  topicName: z
    .string({
      required_error: "Topic name is required",
      invalid_type_error: "Topic name must be a string",
    })
    .trim()
    .min(1, "Topic name is required")
    .max(120, "Topic name cannot exceed 120 characters"),
  isCompleted: z.boolean().optional().default(false),
  completedAt: dateLike.nullable().optional().default(null),
});

const metadataSchema = z
  .object({
    source: normalizeString(60).optional().default("system"),
    notes: normalizeString(1000).optional().default(""),
  })
  .partial()
  .optional();

/**
 * Params
 */
const activityIdParams = z.object({
  id: objectId,
});

const userIdParams = z.object({
  userId: objectId,
});

/**
 * Query schemas
 */
export const listActivitiesQuerySchema = {
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional().default(1),
      limit: z.coerce.number().int().min(1).max(100).optional().default(10),
      search: z.string().trim().max(120).optional(),
      userId: objectId.optional(),
      minProgress: z.coerce.number().min(0).max(100).optional(),
      maxProgress: z.coerce.number().min(0).max(100).optional(),
      from: z.string().datetime("Invalid 'from' datetime").optional(),
      to: z.string().datetime("Invalid 'to' datetime").optional(),
      sort: z.string().trim().max(100).optional().default("updatedAt:desc"),
    })
    .strict("Unexpected query field")
    .superRefine((query, ctx) => {
      if (
        query.minProgress !== undefined &&
        query.maxProgress !== undefined &&
        query.minProgress > query.maxProgress
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["minProgress"],
          message: "minProgress cannot be greater than maxProgress",
        });
      }

      if (query.from && query.to) {
        const from = new Date(query.from);
        const to = new Date(query.to);
        if (from > to) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["from"],
            message: "'from' date cannot be later than 'to' date",
          });
        }
      }
    }),
};

export const activityIdParamSchema = {
  params: activityIdParams,
};

export const userIdParamSchema = {
  params: userIdParams,
};

/**
 * Body schemas
 */
const baseActivityBody = z.object({
  userId: objectId,
  totalLearningTimeMinutes: nonNegativeNumber("Total learning time minutes")
    .optional()
    .default(0),
  lessonsWatched: nonNegativeNumber("Lessons watched").optional().default(0),
  completedTopics: nonNegativeNumber("Completed topics").optional().default(0),
  currentStreakDays: nonNegativeNumber("Current streak days").optional().default(0),
  lastLoginAt: dateLike.nullable().optional().default(null),
  progressPercent: percentage.optional().default(0),
  activityByDate: z.array(activityByDateItemSchema).max(1000).optional().default([]),
  topicProgress: z.array(topicProgressItemSchema).max(5000).optional().default([]),
  metadata: metadataSchema,
});

export const createActivitySchema = {
  body: baseActivityBody.strict("Unexpected body field"),
};

export const updateActivitySchema = {
  params: activityIdParams,
  body: z
    .object({
      userId: objectId.optional(),
      totalLearningTimeMinutes: nonNegativeNumber("Total learning time minutes").optional(),
      lessonsWatched: nonNegativeNumber("Lessons watched").optional(),
      completedTopics: nonNegativeNumber("Completed topics").optional(),
      currentStreakDays: nonNegativeNumber("Current streak days").optional(),
      lastLoginAt: dateLike.nullable().optional(),
      progressPercent: percentage.optional(),
      activityByDate: z.array(activityByDateItemSchema).max(1000).optional(),
      topicProgress: z.array(topicProgressItemSchema).max(5000).optional(),
      metadata: z
        .object({
          source: normalizeString(60).optional(),
          notes: normalizeString(1000).optional(),
        })
        .partial()
        .optional(),
    })
    .strict("Unexpected body field")
    .refine((payload) => Object.keys(payload).length > 0, {
      message: "At least one field is required to update activity",
      path: ["body"],
    }),
};

export const upsertActivityByUserSchema = {
  params: userIdParams,
  body: z
    .object({
      totalLearningTimeMinutes: nonNegativeNumber("Total learning time minutes").optional(),
      lessonsWatched: nonNegativeNumber("Lessons watched").optional(),
      completedTopics: nonNegativeNumber("Completed topics").optional(),
      currentStreakDays: nonNegativeNumber("Current streak days").optional(),
      lastLoginAt: dateLike.nullable().optional(),
      progressPercent: percentage.optional(),
      activityByDate: z.array(activityByDateItemSchema).max(1000).optional(),
      topicProgress: z.array(topicProgressItemSchema).max(5000).optional(),
      metadata: z
        .object({
          source: normalizeString(60).optional(),
          notes: normalizeString(1000).optional(),
        })
        .partial()
        .optional(),
    })
    .strict("Unexpected body field")
    .refine((payload) => Object.keys(payload).length > 0, {
      message: "At least one field is required to upsert activity",
      path: ["body"],
    }),
};

export const deleteActivitySchema = {
  params: activityIdParams,
};

export default {
  listActivitiesQuerySchema,
  activityIdParamSchema,
  userIdParamSchema,
  createActivitySchema,
  updateActivitySchema,
  upsertActivityByUserSchema,
  deleteActivitySchema,
};

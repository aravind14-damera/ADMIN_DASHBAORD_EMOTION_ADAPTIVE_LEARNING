import { z } from "zod";

/**
 * User validators with backward/forward compatibility:
 * - Accept legacy + frontend payload extras via `.passthrough()`
 * - Keep core validation for required/safe fields
 */

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text.length ? text : undefined;
};

const nameSchema = z
  .string({ required_error: "Name is required" })
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(120, "Name cannot exceed 120 characters");

const emailSchema = z
  .string({ required_error: "Email is required" })
  .trim()
  .toLowerCase()
  .email("Please provide a valid email address");

const roleSchema = z.enum(["student", "admin"], {
  errorMap: () => ({ message: "Role must be student or admin" }),
});

const statusSchema = z.enum(["active", "blocked", "inactive"], {
  errorMap: () => ({ message: "Status must be active, blocked, or inactive" }),
});

const percentageSchema = z
  .union([z.number(), z.string()])
  .transform((value) => Number(value))
  .refine((value) => Number.isFinite(value), "Value must be a number")
  .refine((value) => value >= 0, "Value cannot be less than 0")
  .refine((value) => value <= 100, "Value cannot exceed 100");

const nonNegativeNumberSchema = z
  .union([z.number(), z.string()])
  .transform((value) => Number(value))
  .refine((value) => Number.isFinite(value), "Value must be a number")
  .refine((value) => value >= 0, "Value cannot be negative");

const objectIdSchema = z
  .string({ required_error: "Invalid id" })
  .trim()
  .regex(objectIdRegex, "Invalid id format");

const optionalDateSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d;
  },
  z.date({ invalid_type_error: "Invalid date" }),
);

const optionalNullableDateSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === "") return undefined;
    if (value === null) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d;
  },
  z.date({ invalid_type_error: "Invalid date" }).nullable(),
);

const avatarSchema = z.preprocess(
  normalizeOptionalString,
  z
    .union([z.string().url("Avatar URL must be valid"), z.literal("")])
    .optional(),
);

export const createUserSchema = {
  body: z
    .object({
      name: nameSchema,
      email: emailSchema,
      password: z
        .string({ required_error: "Password is required" })
        .trim()
        .min(6, "Password must be at least 6 characters")
        .max(200, "Password cannot exceed 200 characters")
        .optional()
        .default("123456"),
      role: roleSchema.optional().default("student"),

      // Optional compatibility fields from frontend/legacy flows
      avatarUrl: avatarSchema,
      status: statusSchema.optional(),
      learningProgress: percentageSchema.optional(),
      totalLearningTimeMins: nonNegativeNumberSchema.optional(),
      lessonsWatched: nonNegativeNumberSchema.optional(),
      completedTopics: nonNegativeNumberSchema.optional(),
      currentStreakDays: nonNegativeNumberSchema.optional(),
      lastActiveAt: optionalDateSchema.optional(),
      lastLoginAt: optionalNullableDateSchema.optional(),

      metadata: z
        .object({
          emotionTrackingEnabled: z.boolean().optional(),
          preferredLanguage: z.string().trim().min(2).max(10).optional(),
          timezone: z.string().trim().min(1).max(100).optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough(),
};

export const updateUserSchema = {
  params: z
    .object({
      userId: objectIdSchema,
    })
    .passthrough(),
  body: z
    .object({
      name: nameSchema.optional(),
      email: emailSchema.optional(),
      password: z.string().trim().min(6).max(200).optional(),
      role: roleSchema.optional(),

      avatarUrl: avatarSchema,
      status: statusSchema.optional(),
      learningProgress: percentageSchema.optional(),
      totalLearningTimeMins: nonNegativeNumberSchema.optional(),
      lessonsWatched: nonNegativeNumberSchema.optional(),
      completedTopics: nonNegativeNumberSchema.optional(),
      currentStreakDays: nonNegativeNumberSchema.optional(),
      lastActiveAt: optionalDateSchema.optional(),
      lastLoginAt: optionalNullableDateSchema.optional(),

      metadata: z
        .object({
          emotionTrackingEnabled: z.boolean().optional(),
          preferredLanguage: z.string().trim().min(2).max(10).optional(),
          timezone: z.string().trim().min(1).max(100).optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required to update user",
      path: ["body"],
    }),
};

export const getUsersQuerySchema = {
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
      search: z.preprocess(
        normalizeOptionalString,
        z.string().trim().max(120).optional(),
      ),
      status: statusSchema.optional(),
      sort: z
        .string()
        .trim()
        .regex(
          /^[a-zA-Z0-9_]+:(asc|desc)(,[a-zA-Z0-9_]+:(asc|desc))*$/,
          "Sort must be in format field:asc or field:desc",
        )
        .optional(),
    })
    .passthrough(),
};

export const userIdParamSchema = {
  params: z
    .object({
      userId: objectIdSchema,
    })
    .passthrough(),
};

export const blockUserSchema = {
  params: z
    .object({
      userId: objectIdSchema,
    })
    .passthrough(),
  body: z
    .object({
      blocked: z.boolean({
        required_error: "Blocked flag is required",
      }),
    })
    .passthrough(),
};

export const deleteUserSchema = {
  params: z
    .object({
      userId: objectIdSchema,
    })
    .passthrough(),
};

export const userValidators = {
  createUserSchema,
  updateUserSchema,
  getUsersQuerySchema,
  userIdParamSchema,
  blockUserSchema,
  deleteUserSchema,
};

export default userValidators;

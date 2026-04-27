import { z } from "zod";

/**
 * Allowed enums
 */
const insightCategories = [
  "engagement",
  "emotion",
  "difficulty",
  "dropoff",
  "recommendation",
  "performance",
];

const insightSeverities = ["low", "medium", "high", "critical"];

const emotionTypes = [
  "happy",
  "confused",
  "frustrated",
  "angry",
  "neutral",
  "mixed",
];

/**
 * Legacy id formats used in existing collections.
 * - courseRef: c1, c2, ...
 * - moduleRef: m1, m2, ...
 * - lessonRef: l1, l2, ...
 */
const legacyCourseIdRegex = /^c\d+$/i;
const legacyModuleIdRegex = /^m\d+$/i;
const legacyLessonIdRegex = /^l\d+$/i;
const objectIdRegex = /^[a-f\d]{24}$/i;

/**
 * Helpers
 */
const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text.length ? text : undefined;
};

const normalizeOptionalNullableString = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return "";
  return String(value).trim();
};

const optionalNullableNumber = (min, max, fieldLabel = "Value") =>
  z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === undefined || value === null || value === "") return null;
      return Number(value);
    })
    .refine(
      (value) =>
        value === null ||
        (Number.isFinite(value) && value >= min && value <= max),
      `${fieldLabel} must be between ${min} and ${max}`,
    );

const optionalLegacyRef = (regex, label) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => normalizeOptionalNullableString(value))
    .refine(
      (value) => value === "" || regex.test(value),
      `${label} must be a valid legacy id`,
    );

const optionalObjectIdRef = (label = "id") =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => normalizeOptionalNullableString(value))
    .refine(
      (value) => value === "" || objectIdRegex.test(value),
      `${label} must be a valid ObjectId`,
    );

const optionalLegacyOrObjectIdRef = (legacyRegex, label) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => normalizeOptionalNullableString(value))
    .refine(
      (value) =>
        value === "" || legacyRegex.test(value) || objectIdRegex.test(value),
      `${label} must be a valid legacy id or ObjectId`,
    );

/**
 * Nested metrics schema
 */
const metricsSchema = z
  .object({
    emotionType: z.enum(emotionTypes).optional().default("mixed"),
    engagementRate: optionalNullableNumber(0, 100, "engagementRate"),
    dropOffRate: optionalNullableNumber(0, 100, "dropOffRate"),
    avgFocusScore: optionalNullableNumber(0, 100, "avgFocusScore"),
  })
  .passthrough()
  .default({
    emotionType: "mixed",
    engagementRate: null,
    dropOffRate: null,
    avgFocusScore: null,
  });

/**
 * Params
 */
const insightIdParamSchema = z.object({
  id: optionalObjectIdRef("id").refine((v) => v !== "", "id is required"),
});

/**
 * Create insight
 * Refactored to accept legacy string refs:
 * - courseRef: c#
 * - moduleRef: m#
 * - lessonRef: l#
 */
export const createInsightSchema = {
  body: z
    .object({
      title: z
        .string()
        .trim()
        .min(3, "Title must be at least 3 characters")
        .max(120, "Title cannot exceed 120 characters"),
      message: z
        .string()
        .trim()
        .min(10, "Message must be at least 10 characters")
        .max(1000, "Message cannot exceed 1000 characters"),
      category: z.enum(insightCategories, {
        errorMap: () => ({ message: "Invalid category" }),
      }),
      severity: z.enum(insightSeverities).optional().default("medium"),
      confidenceScore: z
        .union([z.number(), z.string(), z.undefined()])
        .transform((v) => (v === undefined ? 0 : Number(v)))
        .refine((v) => Number.isFinite(v), "Confidence score must be a number")
        .refine((v) => v >= 0, "Confidence score cannot be below 0")
        .refine((v) => v <= 100, "Confidence score cannot exceed 100")
        .optional()
        .default(0),

      // Legacy refs
      moduleRef: optionalLegacyOrObjectIdRef(legacyModuleIdRegex, "moduleRef"),
      lessonRef: optionalLegacyOrObjectIdRef(legacyLessonIdRegex, "lessonRef"),
      courseRef: optionalLegacyOrObjectIdRef(legacyCourseIdRegex, "courseRef"),

      metrics: metricsSchema.optional(),
      generatedBy: z
        .enum(["rule-engine", "ai-model", "manual"])
        .optional()
        .default("rule-engine"),
      isActioned: z.boolean().optional().default(false),
      actionNote: z
        .string()
        .trim()
        .max(500, "Action note cannot exceed 500 characters")
        .optional()
        .default(""),
      tags: z
        .array(z.string().trim().min(1).max(40))
        .max(20, "Tags cannot exceed 20 items")
        .optional()
        .default([]),
      generatedAt: z
        .union([
          z.coerce.date(),
          z.string().datetime(),
          z.undefined(),
          z.null(),
        ])
        .transform((value) => {
          if (!value) return new Date();
          if (value instanceof Date) return value;
          return new Date(value);
        }),
    })
    .passthrough()
    .transform((body) => ({
      ...body,
      moduleRef: body.moduleRef ?? "",
      lessonRef: body.lessonRef ?? "",
      courseRef: body.courseRef ?? "",
    })),
};

/**
 * Update insight
 * Refactored to accept legacy string refs:
 * - courseRef: c#
 * - moduleRef: m#
 * - lessonRef: l#
 */
export const updateInsightSchema = {
  params: insightIdParamSchema,
  body: z
    .object({
      title: z.string().trim().min(3).max(120).optional(),
      message: z.string().trim().min(10).max(1000).optional(),
      category: z.enum(insightCategories).optional(),
      severity: z.enum(insightSeverities).optional(),
      confidenceScore: z
        .union([z.number(), z.string()])
        .transform((v) => Number(v))
        .refine((v) => Number.isFinite(v), "confidenceScore must be a number")
        .refine((v) => v >= 0, "confidenceScore cannot be below 0")
        .refine((v) => v <= 100, "confidenceScore cannot exceed 100")
        .optional(),

      // Legacy refs
      moduleRef: optionalLegacyOrObjectIdRef(legacyModuleIdRegex, "moduleRef"),
      lessonRef: optionalLegacyOrObjectIdRef(legacyLessonIdRegex, "lessonRef"),
      courseRef: optionalLegacyOrObjectIdRef(legacyCourseIdRegex, "courseRef"),

      metrics: z
        .object({
          emotionType: z.enum(emotionTypes).optional(),
          engagementRate: optionalNullableNumber(0, 100, "engagementRate"),
          dropOffRate: optionalNullableNumber(0, 100, "dropOffRate"),
          avgFocusScore: optionalNullableNumber(0, 100, "avgFocusScore"),
        })
        .passthrough()
        .optional(),
      generatedBy: z.enum(["rule-engine", "ai-model", "manual"]).optional(),
      isActioned: z.boolean().optional(),
      actionNote: z.string().trim().max(500).optional(),
      tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
      generatedAt: z
        .union([z.coerce.date(), z.string().datetime(), z.null()])
        .optional()
        .transform((value) => {
          if (value === undefined) return undefined;
          if (value === null) return null;
          if (value instanceof Date) return value;
          return new Date(value);
        }),
    })
    .passthrough()
    .refine((payload) => Object.keys(payload).length > 0, {
      message: "At least one field is required to update insight",
    }),
};

/**
 * Mark insight as actioned
 */
export const markInsightActionedSchema = {
  params: insightIdParamSchema,
  body: z
    .object({
      actionNote: z
        .string()
        .trim()
        .max(500, "Action note cannot exceed 500 characters")
        .optional()
        .default(""),
      isActioned: z.boolean().optional().default(true),
    })
    .passthrough(),
};

/**
 * Get one / delete by id
 */
export const insightIdSchema = {
  params: insightIdParamSchema,
};

/**
 * List/filter insights
 */
export const listInsightsQuerySchema = {
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional().default(1),
      limit: z.coerce.number().int().min(1).max(100).optional().default(10),
      search: z.preprocess(
        normalizeOptionalString,
        z.string().trim().max(100).optional(),
      ),
      category: z.enum(insightCategories).optional(),
      severity: z.enum(insightSeverities).optional(),
      generatedBy: z.enum(["rule-engine", "ai-model", "manual"]).optional(),
      isActioned: z
        .union([z.boolean(), z.string()])
        .optional()
        .transform((value) => {
          if (value === undefined) return undefined;
          if (typeof value === "boolean") return value;
          return String(value).toLowerCase() === "true";
        }),
      sort: z.string().trim().optional().default("generatedAt:desc"),
    })
    .passthrough(),
};

export default {
  createInsightSchema,
  updateInsightSchema,
  markInsightActionedSchema,
  insightIdSchema,
  listInsightsQuerySchema,
};

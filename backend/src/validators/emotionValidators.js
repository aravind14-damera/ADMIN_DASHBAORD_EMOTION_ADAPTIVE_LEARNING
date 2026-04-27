import { z } from "zod";

const objectIdRegex = /^[a-f\d]{24}$/i;

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return value;
};

const percentageField = (label) =>
  z
    .union([z.number(), z.string()])
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value),
      `${label} percentage must be a valid number`,
    )
    .refine((value) => value >= 0, `${label} percentage cannot be below 0`)
    .refine((value) => value <= 100, `${label} percentage cannot exceed 100`);

const scoreField = (label) =>
  z
    .union([z.number(), z.string()])
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isFinite(value),
      `${label} must be a valid number`,
    )
    .refine((value) => value >= 0, `${label} cannot be below 0`)
    .refine((value) => value <= 100, `${label} cannot exceed 100`);

const emotionPercentagesSchema = z
  .object({
    happy: percentageField("Happy"),
    confused: percentageField("Confused"),
    frustrated: percentageField("Frustrated"),
    angry: percentageField("Angry"),
    neutral: percentageField("Neutral"),
  })
  .superRefine((value, ctx) => {
    const total =
      Number(value.happy || 0) +
      Number(value.confused || 0) +
      Number(value.frustrated || 0) +
      Number(value.angry || 0) +
      Number(value.neutral || 0);

    const tolerance = 0.01;
    if (Math.abs(total - 100) > tolerance) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["emotionPercentages"],
        message: `Emotion percentages must sum to 100. Current total: ${total.toFixed(2)}`,
      });
    }
  });

const focusMetricsSchema = z.object({
  averageFocusScore: scoreField("Average focus score"),
  mostDifficultTopic: z
    .string({
      required_error: "Most difficult topic is required",
      invalid_type_error: "Most difficult topic must be a string",
    })
    .trim()
    .min(1, "Most difficult topic is required")
    .max(200, "Most difficult topic cannot exceed 200 characters"),
  mostSkippedLesson: z
    .string({
      required_error: "Most skipped lesson is required",
      invalid_type_error: "Most skipped lesson must be a string",
    })
    .trim()
    .min(1, "Most skipped lesson is required")
    .max(200, "Most skipped lesson cannot exceed 200 characters"),
  highestEngagementModule: z
    .string({
      required_error: "Highest engagement module is required",
      invalid_type_error: "Highest engagement module must be a string",
    })
    .trim()
    .min(1, "Highest engagement module is required")
    .max(200, "Highest engagement module cannot exceed 200 characters"),
});

const analyticsIdParams = z.object({
  id: z
    .string({
      required_error: "Analytics id is required",
      invalid_type_error: "Analytics id must be a string",
    })
    .trim()
    .regex(objectIdRegex, "Invalid analytics id"),
});

export const getEmotionAnalyticsSchema = {
  query: z
    .object({
      from: z.string().datetime("Invalid from date format").optional(),
      to: z.string().datetime("Invalid to date format").optional(),
      limit: z.coerce.number().int().min(1).max(365).optional().default(30),
      generatedBy: z.enum(["system", "ai", "manual"]).optional(),
    })
    .strict("Unexpected query field"),
};

export const createEmotionAnalyticsSchema = {
  body: z
    .object({
      date: z.coerce.date().optional(),
      emotionPercentages: emotionPercentagesSchema,
      focusMetrics: focusMetricsSchema,
      generatedBy: z
        .enum(["system", "ai", "manual"])
        .optional()
        .default("system"),
      notes: z
        .string({ invalid_type_error: "Notes must be a string" })
        .trim()
        .max(1000, "Notes cannot exceed 1000 characters")
        .optional()
        .default(""),
      isSeeded: z
        .union([z.boolean(), z.string()])
        .optional()
        .transform((value) => {
          if (value === undefined) return false;
          return toBoolean(value);
        }),
    })
    .strict("Unexpected request body field"),
};

export const updateEmotionAnalyticsSchema = {
  params: analyticsIdParams,
  body: z
    .object({
      date: z.coerce.date().optional(),
      emotionPercentages: emotionPercentagesSchema.optional(),
      focusMetrics: focusMetricsSchema.optional(),
      generatedBy: z.enum(["system", "ai", "manual"]).optional(),
      notes: z
        .string({ invalid_type_error: "Notes must be a string" })
        .trim()
        .max(1000, "Notes cannot exceed 1000 characters")
        .optional(),
    })
    .strict("Unexpected request body field")
    .refine((payload) => Object.keys(payload).length > 0, {
      message: "At least one field is required to update emotion analytics",
      path: ["body"],
    }),
};

export const emotionAnalyticsIdParamSchema = {
  params: analyticsIdParams,
};

export default {
  getEmotionAnalyticsSchema,
  createEmotionAnalyticsSchema,
  updateEmotionAnalyticsSchema,
  emotionAnalyticsIdParamSchema,
};

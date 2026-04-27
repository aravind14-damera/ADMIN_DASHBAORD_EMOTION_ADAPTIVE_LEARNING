import { z } from "zod";

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return value;
};

const optionalBoolean = z.preprocess(toBoolean, z.boolean().optional());

const optionalDate = z
  .union([z.coerce.date(), z.string().datetime(), z.null(), z.undefined()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null) return undefined;
    if (value instanceof Date) return value;
    return new Date(value);
  });

const notificationPreferencesSchema = z
  .object({
    emailAlerts: optionalBoolean,
    platformAlerts: optionalBoolean,
  })
  .partial()
  .optional();

const adminProfileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name cannot exceed 100 characters")
      .optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Please provide a valid email address")
      .optional(),
    avatarUrl: z
      .union([
        z.string().trim().url("Avatar URL must be a valid URL"),
        z.literal(""),
      ])
      .optional(),
    timezone: z
      .string()
      .trim()
      .min(2, "Timezone is required")
      .max(100, "Timezone cannot exceed 100 characters")
      .optional(),
    notificationPreferences: notificationPreferencesSchema,
  })
  .partial()
  .optional();

const settingsBodySchema = z
  .object({
    emotionTrackingEnabled: optionalBoolean,
    captureIntervalSeconds: z
      .preprocess(
        (value) =>
          value === undefined || value === null || value === ""
            ? undefined
            : Number(value),
        z
          .number({
            invalid_type_error: "Capture interval must be a number",
          })
          .int("Capture interval must be an integer")
          .min(10, "Capture interval must be at least 10 seconds")
          .max(3600, "Capture interval cannot exceed 3600 seconds")
          .optional(),
      )
      .optional(),
    cloudinaryConfigured: optionalBoolean,
    cloudinaryLastCheckedAt: optionalDate,
    adminProfile: adminProfileSchema,
    extra: z.record(z.any()).optional(),
    updatedBy: z
      .string()
      .trim()
      .regex(objectIdRegex, "updatedBy must be a valid ObjectId")
      .optional(),
  })
  .strict("Unexpected fields are not allowed");

export const updateSystemSettingsSchema = {
  body: settingsBodySchema.refine(
    (value) => Object.keys(value).length > 0,
    "At least one setting field is required",
  ),
};

export const updateAdminProfileSchema = {
  body: z
    .object({
      adminProfile: adminProfileSchema.refine(
        (profile) => !!profile && Object.keys(profile).length > 0,
        "At least one admin profile field is required",
      ),
    })
    .strict("Unexpected fields are not allowed"),
};

export const updateEmotionTrackingSchema = {
  body: z
    .object({
      emotionTrackingEnabled: z.preprocess(toBoolean, z.boolean()),
      captureIntervalSeconds: z
        .preprocess(
          (value) =>
            value === undefined || value === null || value === ""
              ? undefined
              : Number(value),
          z
            .number({
              invalid_type_error: "Capture interval must be a number",
            })
            .int("Capture interval must be an integer")
            .min(10, "Capture interval must be at least 10 seconds")
            .max(3600, "Capture interval cannot exceed 3600 seconds")
            .optional(),
        )
        .optional(),
    })
    .strict("Unexpected fields are not allowed"),
};

export const setCloudinaryStatusSchema = {
  body: z
    .object({
      cloudinaryConfigured: z.preprocess(toBoolean, z.boolean()),
      cloudinaryLastCheckedAt: optionalDate,
    })
    .strict("Unexpected fields are not allowed"),
};

export const settingsParamsSchema = {
  params: z
    .object({
      key: z
        .string()
        .trim()
        .min(1, "Settings key is required")
        .max(100, "Settings key cannot exceed 100 characters"),
    })
    .strict("Unexpected params are not allowed"),
};

export const settingsQuerySchema = {
  query: z
    .object({
      includeExtra: z
        .union([z.boolean(), z.string()])
        .optional()
        .transform((val) => {
          if (val === undefined) return undefined;
          return toBoolean(val);
        }),
    })
    .partial()
    .optional(),
};

export default {
  updateSystemSettingsSchema,
  updateAdminProfileSchema,
  updateEmotionTrackingSchema,
  setCloudinaryStatusSchema,
  settingsParamsSchema,
  settingsQuerySchema,
};

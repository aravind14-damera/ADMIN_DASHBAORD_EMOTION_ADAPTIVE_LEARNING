import { z } from "zod";
import mongoose from "mongoose";

export const objectId = z
  .string({ required_error: "ID is required" })
  .trim()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), {
    message: "Invalid ID format",
  });

export const email = z
  .string({ required_error: "Email is required" })
  .trim()
  .toLowerCase()
  .email("Please provide a valid email address");

export const password = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password cannot exceed 128 characters")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/[a-z]/, "Password must include at least one lowercase letter")
  .regex(/[0-9]/, "Password must include at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character");

export const optionalPassword = password.optional();

export const name = z
  .string({ required_error: "Name is required" })
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters");

export const title = z
  .string({ required_error: "Title is required" })
  .trim()
  .min(2, "Title must be at least 2 characters")
  .max(120, "Title cannot exceed 120 characters");

export const description = z
  .string({ required_error: "Description is required" })
  .trim()
  .min(10, "Description must be at least 10 characters")
  .max(2000, "Description cannot exceed 2000 characters");

export const optionalDescription = z
  .string()
  .trim()
  .max(2000, "Description cannot exceed 2000 characters")
  .optional()
  .default("");

export const url = z
  .string()
  .trim()
  .url("Please provide a valid URL")
  .optional()
  .or(z.literal(""));

export const positiveNumber = z
  .number({ invalid_type_error: "Value must be a number" })
  .nonnegative("Value cannot be negative");

export const percentage = z
  .number({ invalid_type_error: "Value must be a number" })
  .min(0, "Percentage cannot be below 0")
  .max(100, "Percentage cannot exceed 100");

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().trim().optional(),
  sort: z.string().trim().optional(),
});

export const mongoIdParamSchema = z.object({
  id: objectId,
});

export const dateRangeQuery = z.object({
  from: z
    .string()
    .datetime({ message: "Invalid from date format" })
    .optional(),
  to: z
    .string()
    .datetime({ message: "Invalid to date format" })
    .optional(),
});

export const booleanString = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  });

export const trimString = (min = 1, max = 255, field = "Field") =>
  z
    .string({ required_error: `${field} is required` })
    .trim()
    .min(min, `${field} must be at least ${min} characters`)
    .max(max, `${field} cannot exceed ${max} characters`);

export default {
  objectId,
  email,
  password,
  optionalPassword,
  name,
  title,
  description,
  optionalDescription,
  url,
  positiveNumber,
  percentage,
  paginationQuery,
  mongoIdParamSchema,
  dateRangeQuery,
  booleanString,
  trimString,
};

import mongoose from "mongoose";
import { ZodError } from "zod";
import { isProduction } from "../config/env.js";
import AppError from "../utils/AppError.js";
import { errorResponse } from "../utils/apiResponse.js";

const mapMongooseValidationError = (err) => {
  const details = Object.values(err.errors || {}).map((e) => ({
    field: e.path,
    message: e.message,
    value: e.value,
  }));

  return new AppError("Validation failed", 422, details, "VALIDATION_ERROR");
};

const mapMongooseCastError = (err) =>
  new AppError(
    `Invalid value for field "${err.path}"`,
    400,
    [{ field: err.path, value: err.value }],
    "INVALID_IDENTIFIER"
  );

const mapMongoDuplicateKeyError = (err) => {
  const key = Object.keys(err.keyPattern || {})[0] || "field";
  const value = err.keyValue?.[key];

  return new AppError(
    `${key} "${value}" already exists`,
    409,
    [{ field: key, value }],
    "DUPLICATE_RESOURCE"
  );
};

const mapJwtError = (err) => {
  if (err.name === "TokenExpiredError") {
    return AppError.unauthorized("Session expired. Please login again.", null, "TOKEN_EXPIRED");
  }

  return AppError.unauthorized("Invalid authentication token.", null, "INVALID_TOKEN");
};

const mapZodError = (err) => {
  const details = err.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
    code: issue.code,
  }));

  return new AppError("Validation failed", 422, details, "VALIDATION_ERROR");
};

const normalizeError = (err) => {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) return mapZodError(err);

  if (err instanceof mongoose.Error.ValidationError) {
    return mapMongooseValidationError(err);
  }

  if (err instanceof mongoose.Error.CastError) {
    return mapMongooseCastError(err);
  }

  if (err?.code === 11000) {
    return mapMongoDuplicateKeyError(err);
  }

  if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
    return mapJwtError(err);
  }

  return AppError.internal(
    err?.message || "Something went wrong on the server.",
    null,
    "INTERNAL_SERVER_ERROR"
  );
};

export const notFoundHandler = (req, res, next) => {
  const error = AppError.notFound(
    `Route not found: ${req.method} ${req.originalUrl}`,
    null,
    "ROUTE_NOT_FOUND"
  );
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const normalized = normalizeError(err);

  const payload = errorResponse({
    message: normalized.message,
    code: normalized.code,
    errors: normalized.details,
  });

  if (!isProduction) {
    payload.debug = {
      stack: err?.stack,
      name: err?.name,
    };
  }

  res.status(normalized.statusCode || 500).json(payload);
};

export default errorHandler;

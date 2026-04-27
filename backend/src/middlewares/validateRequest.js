import { ZodError } from "zod";
import AppError from "../utils/AppError.js";

/**
 * Express middleware factory for validating request data with Zod.
 *
 * @param {Object} schema
 * @param {import('zod').ZodTypeAny} [schema.body]
 * @param {import('zod').ZodTypeAny} [schema.params]
 * @param {import('zod').ZodTypeAny} [schema.query]
 * @returns {import('express').RequestHandler}
 */
const validateRequest = (schema = {}) => {
  const { body, params, query } = schema;

  if (!body && !params && !query) {
    throw AppError.internal(
      "Validation middleware misconfigured: provide at least one schema (body/params/query)."
    );
  }

  return async (req, _res, next) => {
    try {
      if (body) {
        req.body = await body.parseAsync(req.body);
      }

      if (params) {
        req.params = await params.parseAsync(req.params);
      }

      if (query) {
        req.query = await query.parseAsync(req.query);
      }

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        }));

        return next(
          AppError.validation("Request validation failed", details, "VALIDATION_ERROR")
        );
      }

      return next(error);
    }
  };
};

export default validateRequest;

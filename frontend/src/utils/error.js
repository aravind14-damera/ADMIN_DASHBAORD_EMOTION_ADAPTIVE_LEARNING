/**
 * Frontend API error helper utility
 * ---------------------------------
 * Normalizes unknown error shapes into a predictable structure for UI handling.
 */

/**
 * Safe object check.
 * @param {unknown} value
 * @returns {value is Record<string, any>}
 */
const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Extracts a message from common backend/frontend error shapes.
 * @param {any} error
 * @returns {string}
 */
export const getErrorMessage = (error) => {
  if (!error) return "Something went wrong";
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;

  // Axios-like: error.response.data.message
  if (isObject(error?.response?.data) && typeof error.response.data.message === "string") {
    return error.response.data.message;
  }

  // API payload-like: error.data.message
  if (isObject(error?.data) && typeof error.data.message === "string") {
    return error.data.message;
  }

  if (typeof error?.message === "string") return error.message;

  return "Something went wrong";
};

/**
 * Extract field-level validation errors from common API formats.
 * Supports:
 * - [{ field, message }]
 * - [{ path, message }]
 * - { fieldName: "message" }
 * - { fieldName: ["msg1", "msg2"] }
 *
 * @param {any} error
 * @returns {Record<string, string>}
 */
export const getFieldErrors = (error) => {
  const out = {};

  const candidates = [
    error?.response?.data?.errors,
    error?.data?.errors,
    error?.errors,
  ];

  const source = candidates.find((v) => v !== undefined && v !== null);
  if (!source) return out;

  if (Array.isArray(source)) {
    source.forEach((item) => {
      if (!isObject(item)) return;
      const key = item.field || item.path;
      const message = item.message;
      if (typeof key === "string" && typeof message === "string") {
        out[key] = message;
      }
    });
    return out;
  }

  if (isObject(source)) {
    Object.entries(source).forEach(([key, value]) => {
      if (typeof value === "string") {
        out[key] = value;
      } else if (Array.isArray(value)) {
        const firstString = value.find((v) => typeof v === "string");
        if (firstString) out[key] = firstString;
      } else if (isObject(value) && typeof value.message === "string") {
        out[key] = value.message;
      }
    });
  }

  return out;
};

/**
 * Returns HTTP status code when available.
 * @param {any} error
 * @returns {number|null}
 */
export const getStatusCode = (error) => {
  const status = error?.response?.status ?? error?.status ?? null;
  return Number.isFinite(Number(status)) ? Number(status) : null;
};

/**
 * Returns backend error code when available.
 * @param {any} error
 * @returns {string|null}
 */
export const getErrorCode = (error) => {
  const code =
    error?.response?.data?.code ??
    error?.data?.code ??
    error?.code ??
    null;

  return typeof code === "string" ? code : null;
};

/**
 * Normalize any error into a consistent shape.
 * @param {any} error
 * @returns {{
 *   message: string;
 *   code: string | null;
 *   status: number | null;
 *   fieldErrors: Record<string, string>;
 *   raw: any;
 * }}
 */
export const normalizeApiError = (error) => ({
  message: getErrorMessage(error),
  code: getErrorCode(error),
  status: getStatusCode(error),
  fieldErrors: getFieldErrors(error),
  raw: error,
});

/**
 * Optional helper: map HTTP status to user-friendly fallback.
 * @param {number|null} status
 * @returns {string}
 */
export const getStatusFallbackMessage = (status) => {
  switch (status) {
    case 400:
      return "Invalid request";
    case 401:
      return "Unauthorized. Please login again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "Requested resource was not found.";
    case 409:
      return "Conflict detected. Please refresh and try again.";
    case 422:
      return "Validation failed. Please check your input.";
    case 429:
      return "Too many requests. Please try again later.";
    case 500:
      return "Server error. Please try again.";
    case 503:
      return "Service unavailable. Please try again later.";
    default:
      return "Something went wrong";
  }
};

const errorUtils = {
  getErrorMessage,
  getFieldErrors,
  getStatusCode,
  getErrorCode,
  normalizeApiError,
  getStatusFallbackMessage,
};

export default errorUtils;

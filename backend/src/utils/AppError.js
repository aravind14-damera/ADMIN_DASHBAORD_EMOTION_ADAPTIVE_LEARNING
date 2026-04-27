class AppError extends Error {
  constructor(
    message = "Internal server error",
    statusCode = 500,
    details = null,
    code = null,
  ) {
    super(message);

    this.name = "AppError";
    this.statusCode = Number.isInteger(statusCode) ? statusCode : 500;
    this.details = details;
    this.code = code || AppError.defaultCode(this.statusCode);
    this.isOperational = true;

    Error.captureStackTrace?.(this, this.constructor);
  }

  static defaultCode(statusCode) {
    const map = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      422: "UNPROCESSABLE_ENTITY",
      429: "TOO_MANY_REQUESTS",
      500: "INTERNAL_SERVER_ERROR",
      503: "SERVICE_UNAVAILABLE",
    };

    return map[statusCode] || "APPLICATION_ERROR";
  }

  static badRequest(
    message = "Bad request",
    details = null,
    code = "BAD_REQUEST",
  ) {
    return new AppError(message, 400, details, code);
  }

  static unauthorized(
    message = "Unauthorized",
    details = null,
    code = "UNAUTHORIZED",
  ) {
    return new AppError(message, 401, details, code);
  }

  static forbidden(message = "Forbidden", details = null, code = "FORBIDDEN") {
    return new AppError(message, 403, details, code);
  }

  static notFound(
    message = "Resource not found",
    details = null,
    code = "NOT_FOUND",
  ) {
    return new AppError(message, 404, details, code);
  }

  static conflict(message = "Conflict", details = null, code = "CONFLICT") {
    return new AppError(message, 409, details, code);
  }

  static validation(
    message = "Validation failed",
    details = null,
    code = "VALIDATION_ERROR",
  ) {
    return new AppError(message, 422, details, code);
  }

  static tooManyRequests(
    message = "Too many requests",
    details = null,
    code = "TOO_MANY_REQUESTS",
  ) {
    return new AppError(message, 429, details, code);
  }

  static internal(
    message = "Internal server error",
    details = null,
    code = "INTERNAL_SERVER_ERROR",
  ) {
    return new AppError(message, 500, details, code);
  }

  static serviceUnavailable(
    message = "Service unavailable",
    details = null,
    code = "SERVICE_UNAVAILABLE",
  ) {
    return new AppError(message, 503, details, code);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      isOperational: this.isOperational,
    };
  }
}

export default AppError;

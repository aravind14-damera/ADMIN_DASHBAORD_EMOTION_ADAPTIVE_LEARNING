import AppError from "../utils/AppError.js";
import Admin from "../models/Admin.js";
import { extractBearerToken, verifyAccessToken } from "../utils/jwt.js";

/**
 * Extract JWT token from Authorization header or auth cookie.
 * Priority:
 * 1) Authorization: Bearer <token>
 * 2) Cookie: token
 */
const getTokenFromRequest = (req) => {
  const headerToken = extractBearerToken(req.headers?.authorization);
  if (headerToken) return headerToken;

  const cookieToken = req.cookies?.token;
  if (typeof cookieToken === "string" && cookieToken.trim()) {
    return cookieToken.trim();
  }

  return null;
};

/**
 * Ensure required token claims are present and valid.
 * We expect verifyAccessToken to already validate signature, expiry, issuer, audience.
 */
const validateDecodedClaims = (decoded) => {
  if (!decoded || typeof decoded !== "object") {
    throw AppError.unauthorized(
      "Invalid authentication token.",
      null,
      "TOKEN_INVALID",
    );
  }

  // We use JWT subject (`sub`) as the canonical admin id.
  if (!decoded.sub || typeof decoded.sub !== "string") {
    throw AppError.unauthorized(
      "Invalid authentication token subject.",
      null,
      "TOKEN_SUBJECT_INVALID",
    );
  }

  if (!decoded.email || typeof decoded.email !== "string") {
    throw AppError.unauthorized(
      "Invalid authentication token email claim.",
      null,
      "TOKEN_EMAIL_INVALID",
    );
  }

  if (!decoded.role || typeof decoded.role !== "string") {
    throw AppError.unauthorized(
      "Invalid authentication token role claim.",
      null,
      "TOKEN_ROLE_INVALID",
    );
  }

  return {
    subjectId: decoded.sub,
    email: decoded.email,
    role: decoded.role,
  };
};

/**
 * Protect routes: requires a valid JWT and loads authenticated admin into req.user
 */
export const protect = async (req, _res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return next(
        AppError.unauthorized(
          "Access denied. Please login to continue.",
          null,
          "TOKEN_MISSING",
        ),
      );
    }

    const decoded = verifyAccessToken(token);
    const claims = validateDecodedClaims(decoded);

    // Use subject id (`sub`) consistently to fetch user
    const admin = await Admin.findById(claims.subjectId).select("+password");
    if (!admin) {
      return next(
        AppError.unauthorized(
          "Account not found for this token.",
          { subject: claims.subjectId },
          "USER_NOT_FOUND",
        ),
      );
    }

    // Optional consistency checks between token claims and DB record
    if (admin.email?.toLowerCase() !== claims.email.toLowerCase()) {
      return next(
        AppError.unauthorized(
          "Token email claim does not match account.",
          null,
          "TOKEN_EMAIL_MISMATCH",
        ),
      );
    }

    if (admin.role !== claims.role) {
      return next(
        AppError.unauthorized(
          "Token role claim is no longer valid.",
          null,
          "TOKEN_ROLE_MISMATCH",
        ),
      );
    }

    req.user = {
      id: admin._id.toString(), // canonical server-side id
      sub: claims.subjectId, // original token subject
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Restrict route access to specific roles.
 * Usage: router.post("/...", protect, authorize("admin"), handler)
 */
export const authorize = (...roles) => {
  const allowedRoles = roles.flat().filter(Boolean);

  return (req, _res, next) => {
    if (!req.user) {
      return next(
        AppError.unauthorized(
          "Authentication required before authorization.",
          null,
          "AUTH_REQUIRED",
        ),
      );
    }

    if (allowedRoles.length === 0) {
      return next(
        AppError.badRequest(
          "No roles provided to authorization middleware.",
          null,
          "ROLES_NOT_DEFINED",
        ),
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          "You do not have permission to perform this action.",
          {
            requiredRoles: allowedRoles,
            currentRole: req.user.role,
          },
          "INSUFFICIENT_ROLE",
        ),
      );
    }

    return next();
  };
};

/**
 * Optional authentication:
 * - Attaches req.user when token exists and is valid
 * - Proceeds silently when token is missing/invalid
 */
export const optionalAuth = async (req, _res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return next();

    const decoded = verifyAccessToken(token);
    const claims = validateDecodedClaims(decoded);

    const admin = await Admin.findById(claims.subjectId);
    if (!admin) return next();

    // Keep checks non-blocking in optional mode
    if (
      admin.email?.toLowerCase() !== claims.email.toLowerCase() ||
      admin.role !== claims.role
    ) {
      return next();
    }

    req.user = {
      id: admin._id.toString(),
      sub: claims.subjectId,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };

    return next();
  } catch (_error) {
    return next();
  }
};

export default { protect, authorize, optionalAuth };

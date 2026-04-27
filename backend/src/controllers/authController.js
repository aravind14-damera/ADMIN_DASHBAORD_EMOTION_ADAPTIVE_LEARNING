import Admin from "../models/Admin.js";
import AppError from "../utils/AppError.js";
import { successResponse } from "../utils/apiResponse.js";
import {
  extractBearerToken,
  generateAccessToken,
  getAuthCookieOptions,
  verifyAccessToken,
} from "../utils/jwt.js";

/**
 * Build safe admin payload for API responses
 * @param {import("../models/Admin.js").default} adminDoc
 */
const buildAdminPayload = (adminDoc) => ({
  _id: adminDoc._id,
  name: adminDoc.name,
  email: adminDoc.email,
  role: adminDoc.role,
  createdAt: adminDoc.createdAt,
  updatedAt: adminDoc.updatedAt,
  lastLoginAt: adminDoc.lastLoginAt,
});

/**
 * Create and send auth response with cookie and token
 */
const sendAuthResponse = ({ res, statusCode = 200, admin, message }) => {
  const token = generateAccessToken({
    id: admin._id.toString(),
    email: admin.email,
    role: admin.role,
  });

  res.cookie("token", token, getAuthCookieOptions());

  return res.status(statusCode).json(
    successResponse({
      message,
      data: {
        admin: buildAdminPayload(admin),
        token,
      },
    }),
  );
};

/**
 * POST /api/auth/signup
 * body: { name, email, password, confirmPassword }
 */
export const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return next(
        AppError.conflict(
          "An admin account with this email already exists.",
          null,
          "EMAIL_EXISTS",
        ),
      );
    }

    await Admin.create({
      name,
      email,
      password,
      role: "admin",
    });

    return res.status(201).json(
      successResponse({
        message: "Admin account created successfully. Please login.",
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/auth/login
 * body: { email, password }
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password");
    if (!admin) {
      return next(
        AppError.unauthorized(
          "Invalid email or password.",
          null,
          "INVALID_CREDENTIALS",
        ),
      );
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return next(
        AppError.unauthorized(
          "Invalid email or password.",
          null,
          "INVALID_CREDENTIALS",
        ),
      );
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    return sendAuthResponse({
      res,
      statusCode: 200,
      admin,
      message: "Login successful.",
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    const cookieOptions = getAuthCookieOptions();
    res.clearCookie("token", {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
    });

    return res.status(200).json(
      successResponse({
        message: "Logged out successfully.",
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/auth/session
 * Checks if user session is valid
 */
export const getSession = async (req, res, next) => {
  try {
    const headerToken = extractBearerToken(req.headers.authorization);
    const cookieToken = req.cookies?.token;
    const token = headerToken || cookieToken;

    if (!token) {
      return next(
        AppError.unauthorized(
          "No active session found.",
          null,
          "SESSION_MISSING",
        ),
      );
    }

    const decoded = verifyAccessToken(token);
    const adminId = decoded.sub;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return next(
        AppError.unauthorized("Session is invalid.", null, "SESSION_INVALID"),
      );
    }

    return res.status(200).json(
      successResponse({
        message: "Session is valid.",
        data: {
          isAuthenticated: true,
          admin: buildAdminPayload(admin),
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

export default {
  signup,
  login,
  logout,
  getSession,
};

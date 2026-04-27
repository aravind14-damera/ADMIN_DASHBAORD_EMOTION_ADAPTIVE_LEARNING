import jwt from "jsonwebtoken";
import env, { isProduction } from "../config/env.js";
import AppError from "./AppError.js";

/**
 * Generates a signed JWT access token for an admin user.
 * @param {{ id: string, email: string, role?: string }} payload
 * @returns {string}
 */
export const generateAccessToken = (payload) => {
  if (!payload?.id || !payload?.email) {
    throw AppError.badRequest("Token payload must include id and email");
  }

  return jwt.sign(
    {
      sub: String(payload.id),
      email: String(payload.email),
      role: payload.role || "admin",
    },
    env.jwt.secret,
    {
      expiresIn: env.jwt.expiresIn,
      issuer: "emotion-learning-admin",
      audience: "admin-dashboard",
    }
  );
};

/**
 * Verifies and decodes a JWT token.
 * Throws AppError if token is invalid or expired.
 * @param {string} token
 * @returns {{ sub: string, email: string, role: string, iat: number, exp: number }}
 */
export const verifyAccessToken = (token) => {
  if (!token || typeof token !== "string") {
    throw AppError.unauthorized("Authorization token is missing");
  }

  try {
    return jwt.verify(token, env.jwt.secret, {
      issuer: "emotion-learning-admin",
      audience: "admin-dashboard",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw AppError.unauthorized("Session expired. Please log in again.");
    }
    throw AppError.unauthorized("Invalid authentication token");
  }
};

/**
 * Returns secure cookie options for storing auth token.
 * @returns {import("express").CookieOptions}
 */
export const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: env.jwt.cookieExpiresInDays * 24 * 60 * 60 * 1000,
  path: "/",
});

/**
 * Extract bearer token from Authorization header.
 * Expected format: "Bearer <token>"
 * @param {string | undefined} authorizationHeader
 * @returns {string | null}
 */
export const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token.trim();
};

export default {
  generateAccessToken,
  verifyAccessToken,
  getAuthCookieOptions,
  extractBearerToken,
};

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import "express-async-errors";

import env, { isDevelopment } from "./config/env.js";
import {
  configureCloudinary,
  isCloudinaryConfigured,
} from "./config/cloudinary.js";

import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import moduleRoutes from "./routes/moduleRoutes.js";
import lessonRoutes from "./routes/lessonRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import emotionRoutes from "./routes/emotionRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import insightRoutes from "./routes/insightRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";

import { notFoundHandler, errorHandler } from "./middlewares/errorHandler.js";
import { successResponse } from "./utils/apiResponse.js";

const app = express();

/**
 * Trust proxy (for deployments behind reverse proxy / load balancer)
 */
if (env.trustProxy) {
  app.set("trust proxy", 1);
}

/**
 * Core security middleware
 */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
);

app.use(cookieParser());

app.use(
  express.json({
    limit: "20mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "20mb",
  }),
);

if (isDevelopment) {
  app.use(morgan("dev"));
}

/**
 * Global API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests from this IP. Please try again later.",
  },
});

app.use("/api", apiLimiter);

/**
 * Health checks
 */
app.get("/health", (_req, res) => {
  return res.status(200).json(
    successResponse({
      message: "Admin backend is healthy",
      data: {
        status: "ok",
        nodeEnv: env.nodeEnv,
        cloudinaryConfigured: isCloudinaryConfigured(),
      },
    }),
  );
});

app.get("/api/v1/status", (_req, res) => {
  return res.status(200).json(
    successResponse({
      message: "API is running",
      data: {
        version: "v1",
      },
    }),
  );
});

/**
 * Configure Cloudinary once at app startup (best effort)
 */
configureCloudinary();

/**
 * API route mounting
 */
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/modules", moduleRoutes);
app.use("/api/v1/lessons", lessonRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/emotions", emotionRoutes);
app.use("/api/v1/activity", activityRoutes);
app.use("/api/v1/insights", insightRoutes);
app.use("/api/v1/settings", settingsRoutes);

/**
 * 404 + global error handlers
 */
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

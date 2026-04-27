import { Router } from "express";

import authRoutes from "./authRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import courseRoutes from "./courseRoutes.js";
import moduleRoutes from "./moduleRoutes.js";
import lessonRoutes from "./lessonRoutes.js";
import userRoutes from "./userRoutes.js";
import emotionRoutes from "./emotionRoutes.js";
import activityRoutes from "./activityRoutes.js";
import insightRoutes from "./insightRoutes.js";
import settingsRoutes from "./settingsRoutes.js";

const router = Router();

/**
 * Health check route for API namespace
 */
router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Admin API is running",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Feature routes
 */
router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/courses", courseRoutes);
router.use("/modules", moduleRoutes);
router.use("/lessons", lessonRoutes);
router.use("/users", userRoutes);
router.use("/emotions", emotionRoutes);
router.use("/activity", activityRoutes);
router.use("/insights", insightRoutes);
router.use("/settings", settingsRoutes);

export default router;

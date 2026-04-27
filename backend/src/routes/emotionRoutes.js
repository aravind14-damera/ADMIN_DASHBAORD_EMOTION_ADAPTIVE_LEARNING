import { Router } from "express";
import {
  getEmotionAnalytics,
  getLatestEmotionAnalytics,
  createEmotionAnalytics,
  updateEmotionAnalytics,
  deleteEmotionAnalytics,
  getEmotionDashboardSummary,
} from "../controllers/emotionController.js";
import { protect, authorize } from "../middlewares/auth.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  getEmotionAnalyticsSchema,
  createEmotionAnalyticsSchema,
  updateEmotionAnalyticsSchema,
  emotionAnalyticsIdParamSchema,
} from "../validators/emotionValidators.js";

const router = Router();

/**
 * All emotion analytics routes are admin-protected.
 */
router.use(protect, authorize("admin"));

/**
 * @route   GET /api/v1/emotions
 * @desc    List emotion analytics (paginated + date filters)
 * @access  Private (Admin)
 */
router.get("/", validateRequest(getEmotionAnalyticsSchema), getEmotionAnalytics);

/**
 * @route   GET /api/v1/emotions/latest
 * @desc    Fetch latest emotion analytics record
 * @access  Private (Admin)
 */
router.get("/latest", getLatestEmotionAnalytics);

/**
 * @route   GET /api/v1/emotions/summary/dashboard
 * @desc    Dashboard-ready emotion summary for cards/charts
 * @access  Private (Admin)
 */
router.get(
  "/summary/dashboard",
  validateRequest(getEmotionAnalyticsSchema),
  getEmotionDashboardSummary
);

/**
 * @route   POST /api/v1/emotions
 * @desc    Create emotion analytics record
 * @access  Private (Admin)
 */
router.post(
  "/",
  validateRequest(createEmotionAnalyticsSchema),
  createEmotionAnalytics
);

/**
 * @route   PATCH /api/v1/emotions/:id
 * @desc    Update emotion analytics record
 * @access  Private (Admin)
 */
router.patch(
  "/:id",
  validateRequest(updateEmotionAnalyticsSchema),
  updateEmotionAnalytics
);

/**
 * @route   DELETE /api/v1/emotions/:id
 * @desc    Delete emotion analytics record
 * @access  Private (Admin)
 */
router.delete(
  "/:id",
  validateRequest(emotionAnalyticsIdParamSchema),
  deleteEmotionAnalytics
);

export default router;

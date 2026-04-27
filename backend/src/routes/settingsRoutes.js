import { Router } from "express";
import {
  getSystemSettings,
  updateSystemSettings,
  updateAdminProfileSettings,
  updateEmotionTrackingSettings,
  refreshCloudinaryStatus,
  setCloudinaryStatus,
} from "../controllers/settingsController.js";
import { protect, authorize } from "../middlewares/auth.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  updateSystemSettingsSchema,
  updateAdminProfileSchema,
  updateEmotionTrackingSchema,
  setCloudinaryStatusSchema,
} from "../validators/settingsValidators.js";

const router = Router();

/**
 * All settings routes are admin-protected.
 */
router.use(protect, authorize("admin"));

/**
 * @route   GET /api/v1/settings
 * @desc    Fetch current system settings
 * @access  Private (Admin)
 */
router.get("/", getSystemSettings);

/**
 * @route   PATCH /api/v1/settings
 * @desc    Update generic system settings fields
 * @access  Private (Admin)
 */
router.patch("/", validateRequest(updateSystemSettingsSchema), updateSystemSettings);

/**
 * @route   PATCH /api/v1/settings/profile
 * @desc    Update admin profile settings
 * @access  Private (Admin)
 */
router.patch(
  "/profile",
  validateRequest(updateAdminProfileSchema),
  updateAdminProfileSettings,
);

/**
 * @route   PATCH /api/v1/settings/emotion-tracking
 * @desc    Enable/disable emotion tracking and optionally update capture interval
 * @access  Private (Admin)
 */
router.patch(
  "/emotion-tracking",
  validateRequest(updateEmotionTrackingSchema),
  updateEmotionTrackingSettings,
);

/**
 * @route   POST /api/v1/settings/cloudinary/refresh
 * @desc    Refresh Cloudinary configuration status from environment
 * @access  Private (Admin)
 */
router.post("/cloudinary/refresh", refreshCloudinaryStatus);

/**
 * @route   PATCH /api/v1/settings/cloudinary
 * @desc    Manually update Cloudinary status
 * @access  Private (Admin)
 */
router.patch(
  "/cloudinary",
  validateRequest(setCloudinaryStatusSchema),
  setCloudinaryStatus,
);

export default router;

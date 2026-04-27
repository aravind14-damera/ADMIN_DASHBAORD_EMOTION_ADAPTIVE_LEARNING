import Setting from "../models/Setting.js";
import AppError from "../utils/AppError.js";
import { successResponse } from "../utils/apiResponse.js";
import { isCloudinaryConfigured } from "../config/cloudinary.js";

/**
 * Ensures system settings document exists
 */
const getOrCreateSystemSettings = async () => {
  const existing = await Setting.findOne({ key: "system" });
  if (existing) return existing;
  return Setting.getSystemSettings();
};

/**
 * GET /api/v1/settings
 * Fetch system settings
 */
export const getSystemSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSystemSettings();

    return res.status(200).json(
      successResponse({
        message: "System settings fetched successfully",
        data: settings,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/v1/settings
 * Update generic system settings fields
 */
export const updateSystemSettings = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    const settings = await getOrCreateSystemSettings();

    // Prevent overriding key through payload
    delete payload.key;
    delete payload._id;

    Object.assign(settings, payload);

    // If admin profile email changes, normalize casing
    if (settings.adminProfile?.email) {
      settings.adminProfile.email = settings.adminProfile.email.toLowerCase().trim();
    }

    // Attach updater from auth context where available
    if (req.user?.id) {
      settings.updatedBy = req.user.id;
    }

    await settings.save();

    return res.status(200).json(
      successResponse({
        message: "System settings updated successfully",
        data: settings,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/v1/settings/profile
 * Update nested admin profile preferences
 */
export const updateAdminProfileSettings = async (req, res, next) => {
  try {
    const { adminProfile } = req.body || {};
    if (!adminProfile || typeof adminProfile !== "object") {
      throw AppError.badRequest("adminProfile payload is required");
    }

    const settings = await getOrCreateSystemSettings();

    settings.adminProfile = {
      ...(settings.adminProfile?.toObject?.() || settings.adminProfile || {}),
      ...adminProfile,
      notificationPreferences: {
        ...((settings.adminProfile?.notificationPreferences &&
          settings.adminProfile.notificationPreferences.toObject?.()) ||
          settings.adminProfile?.notificationPreferences ||
          {}),
        ...(adminProfile.notificationPreferences || {}),
      },
    };

    if (settings.adminProfile?.email) {
      settings.adminProfile.email = settings.adminProfile.email.toLowerCase().trim();
    }

    if (req.user?.id) {
      settings.updatedBy = req.user.id;
    }

    await settings.save();

    return res.status(200).json(
      successResponse({
        message: "Admin profile settings updated successfully",
        data: settings.adminProfile,
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/v1/settings/emotion-tracking
 * Enable/disable emotion tracking and capture interval
 */
export const updateEmotionTrackingSettings = async (req, res, next) => {
  try {
    const { emotionTrackingEnabled, captureIntervalSeconds } = req.body || {};

    if (typeof emotionTrackingEnabled !== "boolean") {
      throw AppError.badRequest("emotionTrackingEnabled must be a boolean value");
    }

    const settings = await getOrCreateSystemSettings();

    settings.emotionTrackingEnabled = emotionTrackingEnabled;

    if (typeof captureIntervalSeconds !== "undefined") {
      const interval = Number(captureIntervalSeconds);
      if (!Number.isInteger(interval) || interval < 10 || interval > 3600) {
        throw AppError.validation(
          "captureIntervalSeconds must be an integer between 10 and 3600",
        );
      }
      settings.captureIntervalSeconds = interval;
    }

    if (req.user?.id) {
      settings.updatedBy = req.user.id;
    }

    await settings.save();

    return res.status(200).json(
      successResponse({
        message: "Emotion tracking settings updated successfully",
        data: {
          emotionTrackingEnabled: settings.emotionTrackingEnabled,
          captureIntervalSeconds: settings.captureIntervalSeconds,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/settings/cloudinary/refresh
 * Refresh Cloudinary configuration status from environment
 */
export const refreshCloudinaryStatus = async (req, res, next) => {
  try {
    const settings = await getOrCreateSystemSettings();

    settings.cloudinaryConfigured = isCloudinaryConfigured();
    settings.cloudinaryLastCheckedAt = new Date();

    if (req.user?.id) {
      settings.updatedBy = req.user.id;
    }

    await settings.save();

    return res.status(200).json(
      successResponse({
        message: "Cloudinary status refreshed successfully",
        data: {
          cloudinaryConfigured: settings.cloudinaryConfigured,
          cloudinaryLastCheckedAt: settings.cloudinaryLastCheckedAt,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/v1/settings/cloudinary
 * Manually set Cloudinary status (optional admin override)
 */
export const setCloudinaryStatus = async (req, res, next) => {
  try {
    const { cloudinaryConfigured, cloudinaryLastCheckedAt } = req.body || {};

    if (typeof cloudinaryConfigured !== "boolean") {
      throw AppError.badRequest("cloudinaryConfigured must be a boolean value");
    }

    const settings = await getOrCreateSystemSettings();

    settings.cloudinaryConfigured = cloudinaryConfigured;
    settings.cloudinaryLastCheckedAt = cloudinaryLastCheckedAt
      ? new Date(cloudinaryLastCheckedAt)
      : new Date();

    if (req.user?.id) {
      settings.updatedBy = req.user.id;
    }

    await settings.save();

    return res.status(200).json(
      successResponse({
        message: "Cloudinary status updated successfully",
        data: {
          cloudinaryConfigured: settings.cloudinaryConfigured,
          cloudinaryLastCheckedAt: settings.cloudinaryLastCheckedAt,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};

export default {
  getSystemSettings,
  updateSystemSettings,
  updateAdminProfileSettings,
  updateEmotionTrackingSettings,
  refreshCloudinaryStatus,
  setCloudinaryStatus,
};

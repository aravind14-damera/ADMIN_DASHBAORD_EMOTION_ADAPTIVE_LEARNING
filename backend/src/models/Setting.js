import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    // System-level configuration
    emotionTrackingEnabled: {
      type: Boolean,
      default: true,
    },
    captureIntervalSeconds: {
      type: Number,
      default: 120,
      min: 10,
      max: 3600,
    },

    // Cloudinary integration health/status
    cloudinaryConfigured: {
      type: Boolean,
      default: false,
    },
    cloudinaryLastCheckedAt: {
      type: Date,
      default: null,
    },

    // Admin profile settings (can be expanded for multi-admin support later)
    adminProfile: {
      fullName: {
        type: String,
        trim: true,
        default: "",
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
      },
      avatarUrl: {
        type: String,
        trim: true,
        default: "",
      },
      timezone: {
        type: String,
        trim: true,
        default: "UTC",
      },
      notificationPreferences: {
        emailAlerts: {
          type: Boolean,
          default: true,
        },
        platformAlerts: {
          type: Boolean,
          default: true,
        },
      },
    },

    // Flexible bucket for additional config flags without schema changes
    extra: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Audit metadata
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Ensure only one primary settings doc is used in app flow via key = "system"
settingSchema.statics.getSystemSettings = async function getSystemSettings() {
  const existing = await this.findOne({ key: "system" });
  if (existing) return existing;

  return this.create({
    key: "system",
    emotionTrackingEnabled: true,
    captureIntervalSeconds: 120,
    cloudinaryConfigured: false,
    adminProfile: {
      fullName: "",
      email: "",
      avatarUrl: "",
      timezone: "UTC",
      notificationPreferences: {
        emailAlerts: true,
        platformAlerts: true,
      },
    },
  });
};

const Setting = mongoose.model("Setting", settingSchema);

export default Setting;

import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Notification model aligned to existing `notifications` collection:
 * {
 *   _id: ObjectId,
 *   user_id: string,
 *   title: string,
 *   message: string,
 *   type: string,
 *   is_read: boolean,
 *   action_link: string | null,
 *   created_at: Date
 * }
 */
const notificationSchema = new Schema(
  {
    user_id: {
      type: String,
      required: [true, "user_id is required"],
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "title is required"],
      trim: true,
      maxlength: [200, "title cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: [true, "message is required"],
      trim: true,
      maxlength: [5000, "message cannot exceed 5000 characters"],
    },
    type: {
      type: String,
      required: [true, "type is required"],
      trim: true,
      lowercase: true,
      enum: ["success", "info", "warning", "error"],
      default: "info",
      index: true,
    },
    is_read: {
      type: Boolean,
      required: [true, "is_read is required"],
      default: false,
      index: true,
    },
    action_link: {
      type: String,
      default: null,
      validate: {
        validator(value) {
          if (value === null || value === "") return true;
          return /^https?:\/\/\S+$/i.test(value);
        },
        message: "action_link must be a valid URL or null",
      },
    },
    created_at: {
      type: Date,
      required: [true, "created_at is required"],
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
    timestamps: false,
    collection: "notifications",
  },
);

notificationSchema.index({ user_id: 1, created_at: -1 });
notificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });

notificationSchema.pre("validate", function normalizeFields(next) {
  if (this.user_id) this.user_id = String(this.user_id).trim();
  if (this.title) this.title = String(this.title).trim();
  if (this.message) this.message = String(this.message).trim();
  if (this.type) this.type = String(this.type).trim().toLowerCase();
  if (typeof this.action_link === "string") {
    const trimmed = this.action_link.trim();
    this.action_link = trimmed.length ? trimmed : null;
  }
  next();
});

const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);

export default Notification;

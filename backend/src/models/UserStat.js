import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Model aligned to existing `userstats` collection.
 * Observed fields:
 * - _id: ObjectId
 * - user_id: string (likely required)
 * - userId: string (legacy/optional variant)
 * - completed_topics: number (optional)
 * - current_streak: number (likely required)
 * - last_active: date (optional)
 * - last_active_date: date (optional)
 */
const userStatSchema = new Schema(
  {
    user_id: {
      type: String,
      required: [true, "user_id is required"],
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    completed_topics: {
      type: Number,
      min: [0, "completed_topics cannot be negative"],
      default: 0,
    },
    current_streak: {
      type: Number,
      min: [0, "current_streak cannot be negative"],
      default: 0,
    },
    last_active: {
      type: Date,
      default: null,
    },
    last_active_date: {
      type: Date,
      default: null,
    },
  },
  {
    versionKey: false,
    timestamps: false,
    collection: "userstats",
  },
);

userStatSchema.pre("validate", function normalizeFields(next) {
  if (this.user_id) this.user_id = String(this.user_id).trim();
  if (this.userId) this.userId = String(this.userId).trim();

  if (!this.userId && this.user_id) {
    this.userId = this.user_id;
  }

  if (!this.user_id && this.userId) {
    this.user_id = this.userId;
  }

  next();
});

// Helps fetch latest stats quickly per user.
userStatSchema.index({ user_id: 1, _id: -1 });

const UserStat =
  mongoose.models.UserStat || mongoose.model("UserStat", userStatSchema);

export default UserStat;

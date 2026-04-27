import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Backward-compatible User model.
 *
 * Supports:
 * 1) Legacy `users` collection shape:
 *    {
 *      _id: ObjectId,
 *      name: string,
 *      email: string,
 *      password: string,
 *      role: "student" | "admin"
 *    }
 *
 * 2) Existing optional app/admin fields used across APIs/UI/tests:
 *    - status, learningProgress, totalLearningTimeMins, lessonsWatched,
 *      completedTopics, currentStreakDays, lastActiveAt, lastLoginAt,
 *      enrolledCourses[], metadata{}, avatarUrl
 */
const userSchema = new Schema(
  {
    // Core legacy fields
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [120, "Name cannot exceed 120 characters"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: {
      type: String,
      // legacy DB has password; some admin-created records may omit it
      // so keep default for backward compatibility in mixed environments/tests
      required: [false, "Password is required"],
      trim: true,
      default: "",
      minlength: [0, "Password must be a valid string"],
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      trim: true,
      lowercase: true,
      default: "student",
      enum: ["student", "admin"],
      index: true,
    },

    // Optional compatibility fields (existing app usage)
    avatarUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: [2000, "Avatar URL is too long"],
    },
    status: {
      type: String,
      trim: true,
      lowercase: true,
      enum: ["active", "blocked", "inactive"],
      default: "active",
      index: true,
    },
    learningProgress: {
      type: Number,
      min: [0, "Learning progress cannot be below 0"],
      max: [100, "Learning progress cannot exceed 100"],
      default: 0,
      index: true,
    },
    totalLearningTimeMins: {
      type: Number,
      min: [0, "Total learning time cannot be negative"],
      default: 0,
    },
    lessonsWatched: {
      type: Number,
      min: [0, "Lessons watched cannot be negative"],
      default: 0,
    },
    completedTopics: {
      type: Number,
      min: [0, "Completed topics cannot be negative"],
      default: 0,
    },
    currentStreakDays: {
      type: Number,
      min: [0, "Current streak cannot be negative"],
      default: 0,
    },
    lastActiveAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
      index: true,
    },

    // Optional nested compatibility fields
    enrolledCourses: [
      {
        course: {
          type: Schema.Types.Mixed, // supports ObjectId or legacy string ids
          ref: "Course",
          default: null,
        },
        progress: {
          type: Number,
          min: [0, "Course progress cannot be below 0"],
          max: [100, "Course progress cannot exceed 100"],
          default: 0,
        },
        enrolledAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    metadata: {
      emotionTrackingEnabled: {
        type: Boolean,
        default: true,
      },
      preferredLanguage: {
        type: String,
        trim: true,
        default: "en",
      },
      timezone: {
        type: String,
        trim: true,
        default: "UTC",
      },
    },
  },
  {
    collection: "users",
    versionKey: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Helpful text index for user search endpoints
userSchema.index({ name: "text", email: "text" });

userSchema.pre("validate", function normalizeUser(next) {
  if (typeof this.name === "string") this.name = this.name.trim();
  if (typeof this.email === "string")
    this.email = this.email.trim().toLowerCase();
  if (typeof this.role === "string") this.role = this.role.trim().toLowerCase();
  if (typeof this.status === "string")
    this.status = this.status.trim().toLowerCase();
  if (typeof this.avatarUrl === "string")
    this.avatarUrl = this.avatarUrl.trim();
  if (typeof this.password === "string") this.password = this.password.trim();

  // Normalize numerics safely
  const numericFields = [
    "learningProgress",
    "totalLearningTimeMins",
    "lessonsWatched",
    "completedTopics",
    "currentStreakDays",
  ];

  for (const key of numericFields) {
    const val = this[key];
    if (val !== undefined && val !== null && val !== "") {
      const n = Number(val);
      if (Number.isFinite(n)) this[key] = n;
    }
  }

  // Clamp progress if provided
  if (typeof this.learningProgress === "number") {
    if (this.learningProgress < 0) this.learningProgress = 0;
    if (this.learningProgress > 100) this.learningProgress = 100;
  }

  // Ensure metadata object exists
  if (!this.metadata || typeof this.metadata !== "object") {
    this.metadata = {
      emotionTrackingEnabled: true,
      preferredLanguage: "en",
      timezone: "UTC",
    };
  }

  next();
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;

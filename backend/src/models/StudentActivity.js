import mongoose from "mongoose";

const { Schema } = mongoose;

const studentActivitySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    totalLearningTimeMinutes: {
      type: Number,
      default: 0,
      min: [0, "Total learning time cannot be negative"],
    },
    lessonsWatched: {
      type: Number,
      default: 0,
      min: [0, "Lessons watched cannot be negative"],
    },
    completedTopics: {
      type: Number,
      default: 0,
      min: [0, "Completed topics cannot be negative"],
    },
    currentStreakDays: {
      type: Number,
      default: 0,
      min: [0, "Current streak cannot be negative"],
    },
    lastLoginAt: {
      type: Date,
      default: null,
      index: true,
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: [0, "Progress cannot be less than 0"],
      max: [100, "Progress cannot be more than 100"],
    },
    activityByDate: [
      {
        date: {
          type: Date,
          required: true,
        },
        learningTimeMinutes: {
          type: Number,
          default: 0,
          min: [0, "Learning time cannot be negative"],
        },
        lessonsWatched: {
          type: Number,
          default: 0,
          min: [0, "Lessons watched cannot be negative"],
        },
      },
    ],
    topicProgress: [
      {
        topicName: {
          type: String,
          required: true,
          trim: true,
          maxlength: [120, "Topic name cannot exceed 120 characters"],
        },
        isCompleted: {
          type: Boolean,
          default: false,
        },
        completedAt: {
          type: Date,
          default: null,
        },
      },
    ],
    metadata: {
      source: {
        type: String,
        trim: true,
        default: "system",
      },
      notes: {
        type: String,
        trim: true,
        maxlength: [1000, "Notes cannot exceed 1000 characters"],
        default: "",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Ensure one activity aggregate document per user
studentActivitySchema.index({ userId: 1 }, { unique: true });

// Useful for leaderboard / progress queries
studentActivitySchema.index({ progressPercent: -1, updatedAt: -1 });

// Virtual: total learning time in hours (rounded to 2 decimals)
studentActivitySchema
  .virtual("totalLearningTimeHours")
  .get(function getHours() {
    return Number((this.totalLearningTimeMinutes / 60).toFixed(2));
  });

// Keep progressPercent normalized
studentActivitySchema.pre("save", function normalizeProgress(next) {
  if (this.progressPercent < 0) this.progressPercent = 0;
  if (this.progressPercent > 100) this.progressPercent = 100;
  next();
});

const StudentActivity = mongoose.model(
  "StudentActivity",
  studentActivitySchema,
);

export default StudentActivity;

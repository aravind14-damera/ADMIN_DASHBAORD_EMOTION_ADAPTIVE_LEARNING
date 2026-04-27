import mongoose from "mongoose";

const emotionBreakdownSchema = new mongoose.Schema(
  {
    happy: {
      type: Number,
      default: 0,
      min: [0, "Happy percentage cannot be below 0"],
      max: [100, "Happy percentage cannot exceed 100"],
    },
    confused: {
      type: Number,
      default: 0,
      min: [0, "Confused percentage cannot be below 0"],
      max: [100, "Confused percentage cannot exceed 100"],
    },
    frustrated: {
      type: Number,
      default: 0,
      min: [0, "Frustrated percentage cannot be below 0"],
      max: [100, "Frustrated percentage cannot exceed 100"],
    },
    angry: {
      type: Number,
      default: 0,
      min: [0, "Angry percentage cannot be below 0"],
      max: [100, "Angry percentage cannot exceed 100"],
    },
    neutral: {
      type: Number,
      default: 0,
      min: [0, "Neutral percentage cannot be below 0"],
      max: [100, "Neutral percentage cannot exceed 100"],
    },
  },
  { _id: false }
);

const focusMetricsSchema = new mongoose.Schema(
  {
    averageFocusScore: {
      type: Number,
      default: 0,
      min: [0, "Average focus score cannot be below 0"],
      max: [100, "Average focus score cannot exceed 100"],
    },
    mostDifficultTopic: {
      type: String,
      trim: true,
      default: "N/A",
      maxlength: [200, "Most difficult topic must be under 200 characters"],
    },
    mostSkippedLesson: {
      type: String,
      trim: true,
      default: "N/A",
      maxlength: [200, "Most skipped lesson must be under 200 characters"],
    },
    highestEngagementModule: {
      type: String,
      trim: true,
      default: "N/A",
      maxlength: [200, "Highest engagement module must be under 200 characters"],
    },
  },
  { _id: false }
);

const emotionAnalyticsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "Analytics date is required"],
      default: Date.now,
      index: true,
    },
    emotionPercentages: {
      type: emotionBreakdownSchema,
      default: () => ({}),
      required: true,
    },
    focusMetrics: {
      type: focusMetricsSchema,
      default: () => ({}),
      required: true,
    },
    generatedBy: {
      type: String,
      enum: ["system", "ai", "manual"],
      default: "system",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Notes must be under 1000 characters"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

emotionAnalyticsSchema.pre("validate", function validateEmotionSum(next) {
  const values = Object.values(this.emotionPercentages?.toObject?.() || this.emotionPercentages || {});
  const total = values.reduce((sum, val) => sum + Number(val || 0), 0);

  // Allow slight floating-point tolerance
  const isValid = total >= 99.5 && total <= 100.5;

  if (!isValid) {
    return next(
      new mongoose.Error.ValidationError(
        Object.assign(new Error("Emotion percentages must sum to 100"), {
          errors: {
            emotionPercentages: new mongoose.Error.ValidatorError({
              message: `Emotion percentages must sum to 100. Current total: ${total.toFixed(2)}`,
              path: "emotionPercentages",
              value: total,
            }),
          },
        })
      )
    );
  }

  return next();
});

emotionAnalyticsSchema.index({ date: -1 });

const EmotionAnalytics = mongoose.model("EmotionAnalytics", emotionAnalyticsSchema);

export default EmotionAnalytics;

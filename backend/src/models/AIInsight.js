import mongoose from "mongoose";

const { Schema } = mongoose;

const aiInsightSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Insight title is required"],
      trim: true,
      maxlength: [120, "Insight title cannot exceed 120 characters"],
    },
    message: {
      type: String,
      required: [true, "Insight message is required"],
      trim: true,
      maxlength: [1000, "Insight message cannot exceed 1000 characters"],
    },
    category: {
      type: String,
      required: true,
      enum: [
        "engagement",
        "emotion",
        "difficulty",
        "dropoff",
        "recommendation",
        "performance",
      ],
      default: "recommendation",
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    confidenceScore: {
      type: Number,
      min: [0, "Confidence score cannot be less than 0"],
      max: [100, "Confidence score cannot exceed 100"],
      default: 0,
    },
    moduleRef: {
      type: String,
      ref: "Module",
      default: "",
      trim: true,
      index: true,
    },
    lessonRef: {
      type: String,
      ref: "Lesson",
      default: "",
      trim: true,
      index: true,
    },
    courseRef: {
      type: String,
      ref: "Course",
      default: "",
      trim: true,
      index: true,
    },
    metrics: {
      emotionType: {
        type: String,
        enum: ["happy", "confused", "frustrated", "angry", "neutral", "mixed"],
        default: "mixed",
      },
      engagementRate: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },
      dropOffRate: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },
      avgFocusScore: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },
    },
    generatedBy: {
      type: String,
      enum: ["rule-engine", "ai-model", "manual"],
      default: "rule-engine",
      index: true,
    },
    isActioned: {
      type: Boolean,
      default: false,
      index: true,
    },
    actionNote: {
      type: String,
      trim: true,
      maxlength: [500, "Action note cannot exceed 500 characters"],
      default: "",
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 20,
        message: "Tags cannot exceed 20 items",
      },
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

aiInsightSchema.index({ category: 1, generatedAt: -1 });
aiInsightSchema.index({ isActioned: 1, severity: -1, generatedAt: -1 });
aiInsightSchema.index({ courseRef: 1, generatedAt: -1 });
aiInsightSchema.index({ moduleRef: 1, generatedAt: -1 });
aiInsightSchema.index({ lessonRef: 1, generatedAt: -1 });

aiInsightSchema.pre("validate", function normalizeLegacyRefs(next) {
  if (typeof this.courseRef === "string")
    this.courseRef = this.courseRef.trim();
  if (typeof this.moduleRef === "string")
    this.moduleRef = this.moduleRef.trim();
  if (typeof this.lessonRef === "string")
    this.lessonRef = this.lessonRef.trim();

  if (this.courseRef === null || this.courseRef === undefined)
    this.courseRef = "";
  if (this.moduleRef === null || this.moduleRef === undefined)
    this.moduleRef = "";
  if (this.lessonRef === null || this.lessonRef === undefined)
    this.lessonRef = "";

  next();
});

aiInsightSchema.statics.getLatest = function getLatest(limit = 10) {
  return this.find({})
    .sort({ generatedAt: -1, createdAt: -1 })
    .limit(Number(limit) || 10);
};

aiInsightSchema.methods.markActioned = function markActioned(note = "") {
  this.isActioned = true;
  if (note) this.actionNote = note.trim();
  return this.save();
};

const AIInsight =
  mongoose.models.AIInsight || mongoose.model("AIInsight", aiInsightSchema);

export default AIInsight;

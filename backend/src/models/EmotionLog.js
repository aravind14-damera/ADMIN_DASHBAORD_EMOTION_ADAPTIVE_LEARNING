import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Model aligned to existing `emotion_logs` collection structure:
 * {
 *   _id: ObjectId,
 *   user_id: string,
 *   lesson_id: string,
 *   emotion: string,
 *   focus: number,
 *   timestamp: Date
 * }
 */
const emotionLogSchema = new Schema(
  {
    user_id: {
      type: String,
      required: [true, "user_id is required"],
      trim: true,
      index: true,
    },
    lesson_id: {
      type: String,
      required: [true, "lesson_id is required"],
      trim: true,
      index: true,
    },
    emotion: {
      type: String,
      required: [true, "emotion is required"],
      trim: true,
      lowercase: true,
      enum: [
        "happy",
        "neutral",
        "confused",
        "frustrated",
        "angry",
        "sad",
        "surprised",
        "fear",
        "disgust",
        "no_face",
      ],
      index: true,
    },
    focus: {
      type: Number,
      required: [true, "focus is required"],
      min: [0, "focus cannot be below 0"],
      max: [100, "focus cannot exceed 100"],
      index: true,
    },
    timestamp: {
      type: Date,
      required: [true, "timestamp is required"],
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
    timestamps: false,
    collection: "emotion_logs",
  },
);

emotionLogSchema.index({ user_id: 1, timestamp: -1 });
emotionLogSchema.index({ lesson_id: 1, timestamp: -1 });
emotionLogSchema.index({ emotion: 1, timestamp: -1 });

emotionLogSchema.pre("validate", function normalizeFields(next) {
  if (this.user_id) this.user_id = String(this.user_id).trim();
  if (this.lesson_id) this.lesson_id = String(this.lesson_id).trim();
  if (this.emotion) this.emotion = String(this.emotion).trim().toLowerCase();
  next();
});

const EmotionLog =
  mongoose.models.EmotionLog || mongoose.model("EmotionLog", emotionLogSchema);

export default EmotionLog;

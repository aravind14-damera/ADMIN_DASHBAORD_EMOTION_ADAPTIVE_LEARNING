import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Model aligned to existing `reader_emotion_logs` collection:
 * {
 *   _id: ObjectId,
 *   user_id: "string",
 *   document_id: "string",
 *   emotion: "string",
 *   confidence: number,
 *   focus_score: number,
 *   timestamp: Date
 * }
 */
const readerEmotionLogSchema = new Schema(
  {
    user_id: {
      type: String,
      required: [true, "user_id is required"],
      trim: true,
      index: true,
    },
    document_id: {
      type: String,
      required: [true, "document_id is required"],
      trim: true,
      index: true,
    },
    emotion: {
      type: String,
      required: [true, "emotion is required"],
      trim: true,
      lowercase: true,
      index: true,
    },
    confidence: {
      type: Number,
      required: [true, "confidence is required"],
      min: [0, "confidence cannot be below 0"],
      max: [100, "confidence cannot exceed 100"],
    },
    focus_score: {
      type: Number,
      required: [true, "focus_score is required"],
      min: [0, "focus_score cannot be below 0"],
      max: [100, "focus_score cannot exceed 100"],
      index: true,
    },
    timestamp: {
      type: Date,
      required: [true, "timestamp is required"],
      index: true,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    timestamps: false,
    collection: "reader_emotion_logs",
  },
);

readerEmotionLogSchema.index({ user_id: 1, timestamp: -1 });
readerEmotionLogSchema.index({ document_id: 1, timestamp: -1 });
readerEmotionLogSchema.index({ emotion: 1, timestamp: -1 });

const ReaderEmotionLog =
  mongoose.models.ReaderEmotionLog ||
  mongoose.model("ReaderEmotionLog", readerEmotionLogSchema);

export default ReaderEmotionLog;

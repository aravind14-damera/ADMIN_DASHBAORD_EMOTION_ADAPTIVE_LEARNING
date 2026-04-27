import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * LearningSession model aligned to existing `learning_sessions` collection.
 * Sample fields observed:
 * - _id: ObjectId
 * - user_id: string
 * - course_id: string
 * - lesson_id: string
 * - start_time: date
 * - end_time: date | null
 * - duration_minutes: number
 * - status: string
 */
const learningSessionSchema = new Schema(
  {
    user_id: {
      type: String,
      required: [true, "user_id is required"],
      trim: true,
      index: true,
    },
    course_id: {
      type: String,
      required: [true, "course_id is required"],
      trim: true,
      index: true,
    },
    lesson_id: {
      type: String,
      required: [true, "lesson_id is required"],
      trim: true,
      index: true,
    },
    start_time: {
      type: Date,
      required: [true, "start_time is required"],
      index: true,
    },
    end_time: {
      type: Date,
      default: null,
    },
    duration_minutes: {
      type: Number,
      required: [true, "duration_minutes is required"],
      min: [0, "duration_minutes cannot be negative"],
      default: 0,
    },
    status: {
      type: String,
      required: [true, "status is required"],
      trim: true,
      enum: ["active", "completed", "paused", "abandoned"],
      default: "active",
      index: true,
    },
  },
  {
    versionKey: false,
    timestamps: false,
    collection: "learning_sessions",
  },
);

learningSessionSchema.index({ user_id: 1, start_time: -1 });
learningSessionSchema.index({ lesson_id: 1, start_time: -1 });

learningSessionSchema.pre("validate", function normalize(next) {
  if (this.user_id) this.user_id = String(this.user_id).trim();
  if (this.course_id) this.course_id = String(this.course_id).trim();
  if (this.lesson_id) this.lesson_id = String(this.lesson_id).trim();
  if (typeof this.duration_minutes === "number" && this.duration_minutes < 0) {
    this.duration_minutes = 0;
  }
  next();
});

const LearningSession =
  mongoose.models.LearningSession ||
  mongoose.model("LearningSession", learningSessionSchema);

export default LearningSession;

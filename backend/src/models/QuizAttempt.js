import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Model aligned to existing `quiz_attempts` collection.
 * Observed fields:
 * - _id: ObjectId
 * - user_id: string
 * - question_id: string
 * - selected_answer: string
 * - is_correct: boolean
 * - emotion: string
 * - focus_score: number
 * - difficulty: string (optional)
 * - timestamp: Date
 */
const quizAttemptSchema = new Schema(
  {
    user_id: {
      type: String,
      required: [true, "user_id is required"],
      trim: true,
      index: true,
    },
    question_id: {
      type: String,
      required: [true, "question_id is required"],
      trim: true,
      index: true,
    },
    selected_answer: {
      type: String,
      required: [true, "selected_answer is required"],
      trim: true,
    },
    is_correct: {
      type: Boolean,
      required: [true, "is_correct is required"],
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
    focus_score: {
      type: Number,
      required: [true, "focus_score is required"],
      min: [0, "focus_score cannot be below 0"],
      max: [100, "focus_score cannot exceed 100"],
      index: true,
    },
    difficulty: {
      type: String,
      trim: true,
      lowercase: true,
      enum: ["easy", "medium", "hard", ""],
      default: "",
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
    collection: "quiz_attempts",
  },
);

quizAttemptSchema.index({ user_id: 1, timestamp: -1 });
quizAttemptSchema.index({ question_id: 1, timestamp: -1 });
quizAttemptSchema.index({ user_id: 1, question_id: 1, timestamp: -1 });

quizAttemptSchema.pre("validate", function normalizeFields(next) {
  if (this.user_id) this.user_id = String(this.user_id).trim();
  if (this.question_id) this.question_id = String(this.question_id).trim();
  if (this.selected_answer) {
    this.selected_answer = String(this.selected_answer).trim();
  }
  if (this.emotion) this.emotion = String(this.emotion).trim().toLowerCase();
  if (this.difficulty !== undefined && this.difficulty !== null) {
    this.difficulty = String(this.difficulty).trim().toLowerCase();
  }
  next();
});

const QuizAttempt =
  mongoose.models.QuizAttempt || mongoose.model("QuizAttempt", quizAttemptSchema);

export default QuizAttempt;

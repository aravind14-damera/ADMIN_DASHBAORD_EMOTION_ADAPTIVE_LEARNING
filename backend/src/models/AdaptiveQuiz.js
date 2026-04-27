import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Model aligned to existing `adaptive_quizzes` collection:
 * {
 *   _id: ObjectId,
 *   course_id: string,
 *   module_id: string,
 *   lesson_id: string,
 *   topic: string,
 *   difficulty: string,
 *   question: string,
 *   options: string[],
 *   correct_answer: string,
 *   explanation: string
 * }
 */
const adaptiveQuizSchema = new Schema(
  {
    course_id: {
      type: String,
      required: [true, "course_id is required"],
      trim: true,
      index: true,
    },
    module_id: {
      type: String,
      required: [true, "module_id is required"],
      trim: true,
      index: true,
    },
    lesson_id: {
      type: String,
      required: [true, "lesson_id is required"],
      trim: true,
      index: true,
    },
    topic: {
      type: String,
      required: [true, "topic is required"],
      trim: true,
      maxlength: [200, "topic cannot exceed 200 characters"],
      index: true,
    },
    difficulty: {
      type: String,
      required: [true, "difficulty is required"],
      trim: true,
      lowercase: true,
      enum: ["easy", "medium", "hard"],
      index: true,
    },
    question: {
      type: String,
      required: [true, "question is required"],
      trim: true,
      maxlength: [2000, "question cannot exceed 2000 characters"],
    },
    options: {
      type: [String],
      required: [true, "options are required"],
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length >= 2 &&
          arr.length <= 10 &&
          arr.every((v) => typeof v === "string" && v.trim().length > 0),
        message: "options must contain 2-10 non-empty strings",
      },
    },
    correct_answer: {
      type: String,
      required: [true, "correct_answer is required"],
      trim: true,
      maxlength: [500, "correct_answer cannot exceed 500 characters"],
    },
    explanation: {
      type: String,
      required: [true, "explanation is required"],
      trim: true,
      maxlength: [3000, "explanation cannot exceed 3000 characters"],
    },
  },
  {
    versionKey: false,
    timestamps: false,
    collection: "adaptive_quizzes",
  },
);

adaptiveQuizSchema.pre("validate", function normalizeFields(next) {
  if (this.course_id) this.course_id = String(this.course_id).trim();
  if (this.module_id) this.module_id = String(this.module_id).trim();
  if (this.lesson_id) this.lesson_id = String(this.lesson_id).trim();
  if (this.topic) this.topic = String(this.topic).replace(/\s+/g, " ").trim();
  if (this.question) this.question = String(this.question).replace(/\s+/g, " ").trim();
  if (this.correct_answer) {
    this.correct_answer = String(this.correct_answer).replace(/\s+/g, " ").trim();
  }
  if (this.explanation) {
    this.explanation = String(this.explanation).replace(/\s+/g, " ").trim();
  }
  if (Array.isArray(this.options)) {
    this.options = this.options.map((opt) => String(opt).replace(/\s+/g, " ").trim());
  }
  next();
});

adaptiveQuizSchema.index({ course_id: 1, module_id: 1, lesson_id: 1, topic: 1 });
adaptiveQuizSchema.index({ lesson_id: 1, difficulty: 1 });
adaptiveQuizSchema.index({ question: "text", topic: "text" });

const AdaptiveQuiz =
  mongoose.models.AdaptiveQuiz || mongoose.model("AdaptiveQuiz", adaptiveQuizSchema);

export default AdaptiveQuiz;

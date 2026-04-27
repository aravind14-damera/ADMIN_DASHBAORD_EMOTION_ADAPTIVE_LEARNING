import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Feedback schema aligned to existing `feedback` collection:
 * {
 *   _id: ObjectId,
 *   user_id: "string",
 *   course_id: "string",
 *   module_id: "string",
 *   lesson_id: "string",
 *   rating: number,
 *   understanding_level: "string",
 *   comment: "string",
 *   created_at: Date
 * }
 */
const feedbackSchema = new Schema(
  {
    user_id: {
      type: String,
      required: [true, "User id is required"],
      trim: true,
      index: true,
    },
    course_id: {
      type: String,
      required: [true, "Course id is required"],
      trim: true,
      index: true,
    },
    module_id: {
      type: String,
      required: [true, "Module id is required"],
      trim: true,
      index: true,
    },
    lesson_id: {
      type: String,
      required: [true, "Lesson id is required"],
      trim: true,
      index: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    understanding_level: {
      type: String,
      required: [true, "Understanding level is required"],
      trim: true,
      enum: ["easy", "medium", "hard"],
      index: true,
    },
    comment: {
      type: String,
      required: [true, "Comment is required"],
      trim: true,
      maxlength: [2000, "Comment cannot exceed 2000 characters"],
    },
    created_at: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
    collection: "feedback",
    timestamps: false,
  },
);

const Feedback = mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);

export default Feedback;

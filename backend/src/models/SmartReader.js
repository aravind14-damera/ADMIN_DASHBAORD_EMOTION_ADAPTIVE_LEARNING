import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Model aligned to existing `smart_reader` collection.
 * Observed fields:
 * - _id: ObjectId
 * - title: string
 * - category: string
 * - difficulty: string
 * - content: string
 * - image_url: string
 * - pdf_url: string
 * - read_time: number (minutes)
 */
const smartReaderSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [300, "Title cannot exceed 300 characters"],
      index: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      maxlength: [120, "Category cannot exceed 120 characters"],
      index: true,
    },
    difficulty: {
      type: String,
      required: [true, "Difficulty is required"],
      trim: true,
      enum: ["Beginner", "Intermediate", "Advanced"],
      index: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
      maxlength: [50000, "Content is too large"],
    },
    image_url: {
      type: String,
      required: [true, "Image URL is required"],
      trim: true,
      maxlength: [2000, "Image URL is too long"],
    },
    pdf_url: {
      type: String,
      required: [true, "PDF URL is required"],
      trim: true,
      maxlength: [2000, "PDF URL is too long"],
    },
    read_time: {
      type: Number,
      required: [true, "Read time is required"],
      min: [0, "Read time cannot be negative"],
      max: [10000, "Read time is unrealistically high"],
      index: true,
    },
  },
  {
    versionKey: false,
    timestamps: false,
    collection: "smart_reader",
  },
);

smartReaderSchema.pre("validate", function normalizeFields(next) {
  if (this.title) this.title = String(this.title).trim().replace(/\s+/g, " ");
  if (this.category) this.category = String(this.category).trim().replace(/\s+/g, " ");
  if (this.difficulty) this.difficulty = String(this.difficulty).trim();
  if (this.content) this.content = String(this.content).trim();
  if (this.image_url) this.image_url = String(this.image_url).trim();
  if (this.pdf_url) this.pdf_url = String(this.pdf_url).trim();
  next();
});

smartReaderSchema.index({ category: 1, difficulty: 1, read_time: 1 });
smartReaderSchema.index({ title: "text", content: "text", category: "text" });

const SmartReader =
  mongoose.models.SmartReader || mongoose.model("SmartReader", smartReaderSchema);

export default SmartReader;

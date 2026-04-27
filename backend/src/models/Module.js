import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Backward-compatible Module model.
 *
 * Primary legacy storage shape:
 * {
 *   _id: "m1",
 *   courseId: "c1",
 *   title: "Arrays"
 * }
 *
 * Compatibility:
 * - Supports `moduleTitle` alias for `title`
 * - Provides `createdAt` fallback when legacy docs don't have timestamps
 */
const moduleSchema = new Schema(
  {
    _id: {
      type: String,
      trim: true,
      default: function generateLegacyModuleId() {
        const now = Date.now();
        const rand = Math.floor(Math.random() * 1000);
        return `m${now}${rand}`;
      },
    },
    courseId: {
      type: String,
      required: [true, "Course id is required"],
      trim: true,
      index: true,
      ref: "Course",
    },
    title: {
      type: String,
      required: [true, "Module title is required"],
      trim: true,
      minlength: [2, "Module title must be at least 2 characters"],
      maxlength: [200, "Module title cannot exceed 200 characters"],
    },
    // Optional compatibility references
    courseRef: {
      type: String,
      default: "",
      trim: true,
      index: true,
      ref: "Course",
    },
    lessonRefs: [
      {
        type: String,
        ref: "Lesson",
      },
    ],
    // Legacy fallback for docs missing timestamps
    createdAtFallback: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },
  },
  {
    versionKey: false,
    timestamps: false,
    collection: "modules",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/**
 * Alias: moduleTitle <-> title
 */
moduleSchema
  .virtual("moduleTitle")
  .get(function getModuleTitle() {
    return this.title;
  })
  .set(function setModuleTitle(value) {
    this.title = value;
  });

/**
 * Virtual createdAt for legacy docs.
 * Falls back to `createdAtFallback`, then tries ObjectId timestamp only if `_id` looks like ObjectId.
 */
moduleSchema.virtual("createdAt").get(function getCreatedAt() {
  if (this.createdAtFallback instanceof Date) return this.createdAtFallback;

  const id = String(this._id || "");
  if (/^[a-f\d]{24}$/i.test(id)) {
    try {
      return new mongoose.Types.ObjectId(id).getTimestamp();
    } catch {
      return null;
    }
  }

  return null;
});

moduleSchema.pre("validate", function normalizeFields(next) {
  if (this._id) this._id = String(this._id).trim();
  if (this.courseId) this.courseId = String(this.courseId).trim();

  if (!this.title && this.moduleTitle) {
    this.title = this.moduleTitle;
  }

  if (this.title) this.title = String(this.title).replace(/\s+/g, " ").trim();
  if (typeof this.courseRef === "string")
    this.courseRef = this.courseRef.trim();

  if (!this.courseRef && this.courseId) this.courseRef = this.courseId;

  next();
});

// Prevent duplicate module title under same course (legacy uniqueness)
moduleSchema.index({ courseId: 1, title: 1 }, { unique: true });
moduleSchema.index({ courseRef: 1, title: 1 });
moduleSchema.index({ title: 1 });

const Module = mongoose.models.Module || mongoose.model("Module", moduleSchema);

export default Module;

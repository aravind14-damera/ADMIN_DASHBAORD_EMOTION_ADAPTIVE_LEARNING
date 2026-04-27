import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Backward-compatible Course model.
 *
 * Primary legacy storage shape:
 * {
 *   _id: "c1",
 *   title: "Data Structures"
 * }
 *
 * Compatibility:
 * - Supports `courseTitle` alias for `title`
 * - Adds optional modern fields used by admin APIs/UI
 * - Enables timestamps while preserving legacy string ids
 */
const courseSchema = new Schema(
  {
    _id: {
      type: String,
      trim: true,
      default: function generateLegacyCourseId() {
        const now = Date.now();
        const rand = Math.floor(Math.random() * 1000);
        return `c${now}${rand}`;
      },
    },

    // Legacy canonical title
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      minlength: [2, "Course title must be at least 2 characters"],
      maxlength: [200, "Course title cannot exceed 200 characters"],
      index: true,
    },

    // Optional compatibility fields for newer frontend/backend expectations
    courseDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: [4000, "Course description cannot exceed 4000 characters"],
    },
    thumbnail: {
      type: String,
      trim: true,
      default: "",
      maxlength: [2000, "Thumbnail URL cannot exceed 2000 characters"],
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
  },
  {
    collection: "courses",
    versionKey: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/**
 * Alias: courseTitle <-> title
 * Keeps old/new payloads compatible.
 */
courseSchema
  .virtual("courseTitle")
  .get(function getCourseTitle() {
    return this.title;
  })
  .set(function setCourseTitle(value) {
    this.title = value;
  });

/**
 * Virtual relation: modules under this course
 * (legacy string key mapping: Course._id -> Module.courseId)
 */
courseSchema.virtual("modules", {
  ref: "Module",
  localField: "_id",
  foreignField: "courseId",
  justOne: false,
});

courseSchema.pre("validate", function normalizeFields(next) {
  if (this._id) this._id = String(this._id).trim();

  // Map alias if only courseTitle is passed
  if (!this.title && this.courseTitle) {
    this.title = this.courseTitle;
  }

  if (this.title) {
    this.title = String(this.title).replace(/\s+/g, " ").trim();
  }

  if (typeof this.courseDescription === "string") {
    this.courseDescription = this.courseDescription.trim();
  }

  if (typeof this.thumbnail === "string") {
    this.thumbnail = this.thumbnail.trim();
  }

  if (typeof this.createdBy === "string") {
    this.createdBy = this.createdBy.trim();
  }

  next();
});

const Course = mongoose.models.Course || mongoose.model("Course", courseSchema);

export default Course;

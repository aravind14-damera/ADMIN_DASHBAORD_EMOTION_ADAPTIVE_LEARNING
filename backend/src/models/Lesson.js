import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Backward-compatible Lesson model.
 *
 * Legacy storage shape in `lessons` collection:
 * {
 *   _id: ObjectId,
 *   lesson_id: "l1",
 *   moduleId: "m1",
 *   title: "Lesson Title",
 *   videoUrl: "https://..."
 * }
 *
 * Compatibility goals:
 * - Accept/serve aliases:
 *   - lessonTitle <-> title
 *   - videoURL <-> videoUrl
 * - Provide optional modern fields used by existing API/UI flows
 * - Keep legacy fields as canonical persisted keys
 */
const lessonSchema = new Schema(
  {
    // Legacy canonical fields
    lesson_id: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },
    moduleId: {
      type: String,
      required: [true, "Module id is required"],
      trim: true,
      index: true,
      ref: "Module",
    },
    title: {
      type: String,
      required: [true, "Lesson title is required"],
      trim: true,
      minlength: [2, "Lesson title must be at least 2 characters"],
      maxlength: [200, "Lesson title cannot exceed 200 characters"],
      index: true,
    },
    videoUrl: {
      type: String,
      default: "",
      trim: true,
    },

    // Compatibility / optional fields
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    duration: {
      type: Number,
      default: 0,
      min: [0, "Duration cannot be negative"],
    },
    order: {
      type: Number,
      default: 1,
      min: [1, "Order must be at least 1"],
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    uploadStatus: {
      type: String,
      trim: true,
      default: "pending",
      enum: ["pending", "uploaded", "failed"],
      index: true,
    },

    // Optional media metadata used by upload flows
    videoPublicId: {
      type: String,
      default: "",
      trim: true,
    },
    videoResourceType: {
      type: String,
      trim: true,
      default: "video",
    },
    videoFormat: {
      type: String,
      default: "",
      trim: true,
    },
    videoBytes: {
      type: Number,
      default: 0,
      min: [0, "videoBytes cannot be negative"],
    },
    videoDuration: {
      type: Number,
      default: 0,
      min: [0, "videoDuration cannot be negative"],
    },

    // Backward helper field
    moduleRef: {
      type: String,
      ref: "Module",
      default: "",
      index: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
    collection: "lessons",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/**
 * Alias: lessonTitle <-> title
 */
lessonSchema
  .virtual("lessonTitle")
  .get(function getLessonTitle() {
    return this.title;
  })
  .set(function setLessonTitle(value) {
    this.title = value;
  });

/**
 * Alias: videoURL <-> videoUrl
 */
lessonSchema
  .virtual("videoURL")
  .get(function getVideoURL() {
    return this.videoUrl;
  })
  .set(function setVideoURL(value) {
    this.videoUrl = value;
  });

/**
 * Derived convenience flag used by frontend.
 */
lessonSchema.virtual("hasVideo").get(function getHasVideo() {
  return Boolean(this.videoUrl);
});

lessonSchema.pre("validate", function normalizeFields(next) {
  // Keep legacy id shape available
  if (!this.lesson_id && this._id) {
    // fallback generated legacy id when missing
    this.lesson_id = `l${String(this._id).slice(-6)}`;
  }

  if (this.lesson_id) this.lesson_id = String(this.lesson_id).trim();
  if (this.moduleId) this.moduleId = String(this.moduleId).trim();

  // Sync helper ref
  this.moduleRef = this.moduleId || "";

  // Aliases safety
  if (!this.title && this.lessonTitle) this.title = this.lessonTitle;
  if (!this.videoUrl && this.videoURL) this.videoUrl = this.videoURL;

  if (this.title) this.title = String(this.title).replace(/\s+/g, " ").trim();
  if (this.videoUrl) this.videoUrl = String(this.videoUrl).trim();
  if (this.description) this.description = String(this.description).trim();

  if (!Number.isFinite(Number(this.duration)) || Number(this.duration) < 0) {
    this.duration = 0;
  }
  if (!Number.isFinite(Number(this.order)) || Number(this.order) < 1) {
    this.order = 1;
  }

  next();
});

// Legacy uniqueness + useful query indexes
lessonSchema.index({ moduleId: 1, lesson_id: 1 }, { unique: true });
lessonSchema.index({ moduleId: 1, title: 1 }, { unique: false });
lessonSchema.index({ moduleId: 1, order: 1 });

const Lesson = mongoose.models.Lesson || mongoose.model("Lesson", lessonSchema);

export default Lesson;

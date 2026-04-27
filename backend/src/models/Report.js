import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Placeholder model for legacy `reports` collection.
 * This collection is currently empty and may contain dynamic shapes.
 */
const reportSchema = new Schema(
  {
    // Optional common fields (kept flexible)
    title: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Flexible payload for legacy/report-specific structures
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    versionKey: false,
    timestamps: false,
    strict: false, // allow evolving legacy structures
    collection: "reports",
  },
);

reportSchema.index({ created_at: -1, type: 1 });

const Report = mongoose.models.Report || mongoose.model("Report", reportSchema);

export default Report;

import cloudinary, { configureCloudinary, isCloudinaryConfigured } from "../config/cloudinary.js";
import env from "../config/env.js";
import AppError from "../utils/AppError.js";

const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500MB default safety cap
const ALLOWED_VIDEO_MIME_PREFIX = "video/";
const ALLOWED_RESOURCE_TYPES = new Set(["video", "raw"]);

const ensureCloudinaryReady = () => {
  const configured = configureCloudinary();
  if (!configured || !isCloudinaryConfigured()) {
    throw AppError.serviceUnavailable(
      "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }
};

const validateVideoFile = (file) => {
  if (!file) {
    throw AppError.badRequest("Video file is required.");
  }

  const mimeType = file.mimetype || "";
  if (!mimeType.startsWith(ALLOWED_VIDEO_MIME_PREFIX)) {
    throw AppError.validation("Only video files are allowed for lesson uploads.");
  }

  const size = Number(file.size || 0);
  if (size <= 0) {
    throw AppError.validation("Uploaded video file appears to be empty.");
  }

  if (size > MAX_VIDEO_BYTES) {
    throw AppError.validation(`Video exceeds max allowed size (${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))}MB).`);
  }
};

const buildPublicId = (lessonTitle = "lesson-video") => {
  const slug = String(lessonTitle)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  const uniquePart = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${slug || "lesson-video"}-${uniquePart}`;
};

const uploadVideoBuffer = async ({ file, folder, publicId, context = {} }) => {
  ensureCloudinaryReady();
  validateVideoFile(file);

  const finalFolder = folder || env.cloudinary.folder || "emotion-learning-admin";
  const finalPublicId = publicId || buildPublicId(context.lessonTitle);

  const uploadOptions = {
    resource_type: "video",
    folder: finalFolder,
    public_id: finalPublicId,
    overwrite: true,
    use_filename: false,
    unique_filename: false,
    context,
  };

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, uploaded) => {
        if (error) return reject(error);
        return resolve(uploaded);
      });

      stream.end(file.buffer);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type || "video",
      format: result.format || "",
      bytes: Number(result.bytes || 0),
      duration: Number(result.duration || 0),
      width: Number(result.width || 0),
      height: Number(result.height || 0),
      version: result.version,
    };
  } catch (error) {
    throw AppError.internal("Failed to upload video to Cloudinary.", {
      cloudinaryError: error?.message || "Unknown upload error",
    });
  }
};

const deleteAsset = async (publicId, resourceType = "video") => {
  ensureCloudinaryReady();

  if (!publicId || typeof publicId !== "string") {
    throw AppError.badRequest("A valid Cloudinary publicId is required.");
  }

  if (!ALLOWED_RESOURCE_TYPES.has(resourceType)) {
    throw AppError.validation("Invalid Cloudinary resource type provided.");
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });

    return {
      success: result?.result === "ok" || result?.result === "not found",
      raw: result,
    };
  } catch (error) {
    throw AppError.internal("Failed to delete Cloudinary asset.", {
      publicId,
      cloudinaryError: error?.message || "Unknown delete error",
    });
  }
};

const replaceVideo = async ({
  file,
  previousPublicId,
  previousResourceType = "video",
  folder,
  publicId,
  context = {},
}) => {
  const uploaded = await uploadVideoBuffer({ file, folder, publicId, context });

  if (previousPublicId) {
    // Best-effort cleanup; we don't block response if old asset delete fails.
    try {
      await deleteAsset(previousPublicId, previousResourceType);
    } catch {
      // intentionally ignored
    }
  }

  return uploaded;
};

export default {
  uploadVideoBuffer,
  deleteAsset,
  replaceVideo,
  validateVideoFile,
  buildPublicId,
};

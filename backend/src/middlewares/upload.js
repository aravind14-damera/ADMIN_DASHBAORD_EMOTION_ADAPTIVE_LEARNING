import multer from "multer";
import AppError from "../utils/AppError.js";

// Use memory storage so file buffer can be sent directly to Cloudinary
const storage = multer.memoryStorage();

const allowedVideoMimeTypes = new Set([
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
  "video/ogg",
  "application/octet-stream", // fallback for some clients/uploader libraries
]);

const MAX_VIDEO_SIZE_MB = 500;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

const fileFilter = (req, file, cb) => {
  if (!file) {
    return cb(AppError.badRequest("No file received"));
  }

  const isVideoByMime = allowedVideoMimeTypes.has(file.mimetype);
  const isVideoByExt = /\.(mp4|mpeg|mpg|mov|avi|mkv|webm|ogv)$/i.test(
    file.originalname || "",
  );

  if (!isVideoByMime && !isVideoByExt) {
    return cb(
      AppError.validation("Only valid video files are allowed", {
        field: "video",
        allowed: Array.from(allowedVideoMimeTypes),
      }),
    );
  }

  return cb(null, true);
};

const baseUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE_BYTES,
    files: 1,
  },
});

// Middleware for single lesson video upload
export const uploadLessonVideo = baseUpload.single("video");

// Optional helper for custom field names if needed later
export const uploadSingleVideo = (fieldName = "video") =>
  baseUpload.single(fieldName);

// Multer error translator middleware (use after route handlers if needed)
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return next(
        AppError.badRequest(
          `Video size exceeds ${MAX_VIDEO_SIZE_MB}MB limit. Please upload a smaller file.`,
        ),
      );
    }
    return next(AppError.badRequest(`Upload error: ${error.message}`));
  }

  return next(error);
};

export default uploadLessonVideo;

import { Router } from "express";
import {
  createLesson,
  getLessons,
  getLessonById,
  updateLesson,
  deleteLesson,
  uploadLessonVideo,
  replaceLessonVideo,
  removeLessonVideo,
} from "../controllers/lessonController.js";
import { protect, authorize } from "../middlewares/auth.js";
import validateRequest from "../middlewares/validateRequest.js";
import { uploadLessonVideo as uploadLessonVideoMiddleware } from "../middlewares/upload.js";
import {
  createLessonSchema,
  updateLessonSchema,
  lessonIdParamSchema,
  lessonListQuerySchema,
  uploadLessonVideoSchema,
} from "../validators/lessonValidators.js";

const router = Router();

// Protect all lesson routes for admin only
router.use(protect, authorize("admin"));

/**
 * @route   POST /api/v1/lessons
 * @desc    Create a lesson
 * @access  Private (Admin)
 */
router.post("/", validateRequest(createLessonSchema), createLesson);

/**
 * @route   GET /api/v1/lessons
 * @desc    Get all lessons (paginated/searchable)
 * @access  Private (Admin)
 */
router.get("/", validateRequest(lessonListQuerySchema), getLessons);

/**
 * @route   GET /api/v1/lessons/:lessonId
 * @desc    Get lesson by ID
 * @access  Private (Admin)
 */
router.get("/:lessonId", validateRequest(lessonIdParamSchema), getLessonById);

/**
 * @route   PATCH /api/v1/lessons/:lessonId
 * @desc    Update lesson by ID
 * @access  Private (Admin)
 */
router.patch("/:lessonId", validateRequest(updateLessonSchema), updateLesson);

/**
 * @route   DELETE /api/v1/lessons/:lessonId
 * @desc    Delete lesson by ID
 * @access  Private (Admin)
 */
router.delete("/:lessonId", validateRequest(lessonIdParamSchema), deleteLesson);

/**
 * @route   POST /api/v1/lessons/:lessonId/video
 * @desc    Upload lesson video
 * @access  Private (Admin)
 */
router.post(
  "/:lessonId/video",
  validateRequest(uploadLessonVideoSchema),
  uploadLessonVideoMiddleware,
  uploadLessonVideo,
);

/**
 * @route   PUT /api/v1/lessons/:lessonId/video
 * @desc    Replace lesson video
 * @access  Private (Admin)
 */
router.put(
  "/:lessonId/video",
  validateRequest(uploadLessonVideoSchema),
  uploadLessonVideoMiddleware,
  replaceLessonVideo,
);

/**
 * @route   DELETE /api/v1/lessons/:lessonId/video
 * @desc    Remove lesson video
 * @access  Private (Admin)
 */
router.delete(
  "/:lessonId/video",
  validateRequest(uploadLessonVideoSchema),
  removeLessonVideo,
);

export default router;

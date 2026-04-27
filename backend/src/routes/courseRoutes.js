import { Router } from "express";
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} from "../controllers/courseController.js";
import validateRequest from "../middlewares/validateRequest.js";
import { protect, authorize } from "../middlewares/auth.js";
import {
  createCourseSchema,
  listCoursesSchema,
  getCourseByIdSchema,
  updateCourseSchema,
  deleteCourseSchema,
} from "../validators/courseValidators.js";

const router = Router();

// All course routes are private and admin-only
router.use(protect, authorize("admin"));

/**
 * @route   POST /api/v1/courses
 * @desc    Create a new course
 * @access  Private (Admin)
 */
router.post("/", validateRequest(createCourseSchema), createCourse);

/**
 * @route   GET /api/v1/courses
 * @desc    Get all courses (paginated/searchable)
 * @access  Private (Admin)
 */
router.get("/", validateRequest(listCoursesSchema), getCourses);

/**
 * @route   GET /api/v1/courses/:courseId
 * @desc    Get single course by ID
 * @access  Private (Admin)
 */
router.get("/:courseId", validateRequest(getCourseByIdSchema), getCourseById);

/**
 * @route   PATCH /api/v1/courses/:courseId
 * @desc    Update course by ID
 * @access  Private (Admin)
 */
router.patch("/:courseId", validateRequest(updateCourseSchema), updateCourse);

/**
 * @route   DELETE /api/v1/courses/:courseId
 * @desc    Delete course by ID (with cascade cleanup)
 * @access  Private (Admin)
 */
router.delete("/:courseId", validateRequest(deleteCourseSchema), deleteCourse);

export default router;

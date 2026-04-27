import { Router } from "express";
import {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  upsertActivityByUser,
  getActivitySummary,
} from "../controllers/activityController.js";
import { protect, authorize } from "../middlewares/auth.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  listActivitiesQuerySchema,
  activityIdParamSchema,
  createActivitySchema,
  updateActivitySchema,
  upsertActivityByUserSchema,
  deleteActivitySchema,
} from "../validators/activityValidators.js";

const router = Router();

// All activity routes are admin-protected
router.use(protect, authorize("admin"));

/**
 * @route   GET /api/v1/activity
 * @desc    Get paginated student activity list with optional filters
 * @access  Private (Admin)
 */
router.get("/", validateRequest(listActivitiesQuerySchema), getActivities);

/**
 * @route   GET /api/v1/activity/summary
 * @desc    Get aggregate activity summary cards/metrics
 * @access  Private (Admin)
 */
router.get("/summary", getActivitySummary);

/**
 * @route   GET /api/v1/activity/:id
 * @desc    Get a single student activity record by id
 * @access  Private (Admin)
 */
router.get("/:id", validateRequest(activityIdParamSchema), getActivityById);

/**
 * @route   POST /api/v1/activity
 * @desc    Create a student activity record
 * @access  Private (Admin)
 */
router.post("/", validateRequest(createActivitySchema), createActivity);

/**
 * @route   PATCH /api/v1/activity/:id
 * @desc    Update a student activity record by id
 * @access  Private (Admin)
 */
router.patch("/:id", validateRequest(updateActivitySchema), updateActivity);

/**
 * @route   DELETE /api/v1/activity/:id
 * @desc    Delete a student activity record by id
 * @access  Private (Admin)
 */
router.delete("/:id", validateRequest(deleteActivitySchema), deleteActivity);

/**
 * @route   PUT /api/v1/activity/user/:userId
 * @desc    Upsert student activity by user id
 * @access  Private (Admin)
 *
 * NOTE:
 * upsertActivityByUserSchema already validates both `params` and `body`,
 * so a single validation middleware is sufficient.
 */
router.put(
  "/user/:userId",
  validateRequest(upsertActivityByUserSchema),
  upsertActivityByUser,
);

export default router;

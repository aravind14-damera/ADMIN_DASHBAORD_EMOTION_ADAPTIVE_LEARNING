import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  blockUser,
  deleteUser,
} from "../controllers/userController.js";
import { protect, authorize } from "../middlewares/auth.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  createUserSchema,
  updateUserSchema,
  getUsersQuerySchema,
  userIdParamSchema,
  blockUserSchema,
  deleteUserSchema,
} from "../validators/userValidators.js";

const router = Router();

/**
 * All user routes are admin-protected.
 */
router.use(protect, authorize("admin"));

/**
 * GET /api/v1/users
 * Query params:
 * - page, limit, search, status, sort
 */
router.get("/", validateRequest(getUsersQuerySchema), getUsers);

/**
 * POST /api/v1/users
 * Create a student user profile (for future/admin data management).
 */
router.post("/", validateRequest(createUserSchema), createUser);

/**
 * GET /api/v1/users/:userId
 * Get one user by ID.
 */
router.get("/:userId", validateRequest(userIdParamSchema), getUserById);

/**
 * PATCH /api/v1/users/:userId
 * Update user profile fields and progress-related data.
 */
router.patch("/:userId", validateRequest(updateUserSchema), updateUser);

/**
 * PATCH /api/v1/users/:userId/block
 * Body: { blocked: boolean }
 * Block or unblock a user.
 */
router.patch("/:userId/block", validateRequest(blockUserSchema), blockUser);

/**
 * DELETE /api/v1/users/:userId
 * Permanently delete user and linked activity.
 */
router.delete("/:userId", validateRequest(deleteUserSchema), deleteUser);

export default router;

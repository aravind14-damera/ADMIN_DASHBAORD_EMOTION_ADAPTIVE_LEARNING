import { Router } from "express";

import {
  createModule,
  getModules,
  getModulesByCourse,
  getModuleById,
  updateModule,
  deleteModule,
} from "../controllers/moduleController.js";

import { protect, authorize } from "../middlewares/auth.js";
import validateRequest from "../middlewares/validateRequest.js";

import {
  createModuleSchema,
  updateModuleSchema,
  getModulesByCourseSchema,
  moduleIdSchema,
  listModulesQuerySchema,
} from "../validators/moduleValidators.js";

const router = Router();

// All module routes are private and admin-only
router.use(protect, authorize("admin"));

// CRUD + listing
router.get("/", validateRequest(listModulesQuerySchema), getModules);
router.post("/", validateRequest(createModuleSchema), createModule);

// Course-scoped modules
router.get(
  "/course/:courseId",
  validateRequest(getModulesByCourseSchema),
  getModulesByCourse,
);

// Single module operations
router.get("/:moduleId", validateRequest(moduleIdSchema), getModuleById);
router.patch("/:moduleId", validateRequest(updateModuleSchema), updateModule);
router.delete("/:moduleId", validateRequest(moduleIdSchema), deleteModule);

export default router;

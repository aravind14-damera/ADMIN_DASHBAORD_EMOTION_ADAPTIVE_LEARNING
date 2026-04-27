import { Router } from "express";
import {
  createInsight,
  getInsights,
  getLatestInsights,
  getInsightById,
  updateInsight,
  markInsightActioned,
  bulkMarkInsightsActioned,
  deleteInsight,
  getInsightSummary,
} from "../controllers/insightController.js";
import { protect, authorize } from "../middlewares/auth.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  createInsightSchema,
  updateInsightSchema,
  markInsightActionedSchema,
  insightIdSchema,
  listInsightsQuerySchema,
} from "../validators/insightValidators.js";

const router = Router();

// All insight routes are admin-protected
router.use(protect, authorize("admin"));

/**
 * Summary & quick panels
 */
router.get("/summary", getInsightSummary);
router.get("/latest", getLatestInsights);

/**
 * Collection routes
 */
router
  .route("/")
  .get(validateRequest(listInsightsQuerySchema), getInsights)
  .post(validateRequest(createInsightSchema), createInsight);

/**
 * Action workflows
 */
router.patch("/action/bulk", bulkMarkInsightsActioned);
router.patch(
  "/:id/action",
  validateRequest(markInsightActionedSchema),
  markInsightActioned,
);

/**
 * Item routes
 */
router
  .route("/:id")
  .get(validateRequest(insightIdSchema), getInsightById)
  .patch(validateRequest(updateInsightSchema), updateInsight)
  .delete(validateRequest(insightIdSchema), deleteInsight);

export default router;

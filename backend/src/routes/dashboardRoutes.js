import { Router } from "express";
import {
  getDashboardOverview,
  getDashboardSummaryCards,
} from "../controllers/dashboardController.js";
import { protect, authorize } from "../middlewares/auth.js";

const router = Router();

// All dashboard routes are protected for admin users
router.use(protect, authorize("admin"));

/**
 * @route   GET /api/v1/dashboard/overview
 * @desc    Get full dashboard overview (KPIs, charts, quick stats)
 * @access  Private (Admin)
 */
router.get("/overview", getDashboardOverview);

/**
 * @route   GET /api/v1/dashboard/summary-cards
 * @desc    Get lightweight dashboard summary cards
 * @access  Private (Admin)
 */
router.get("/summary-cards", getDashboardSummaryCards);

export default router;

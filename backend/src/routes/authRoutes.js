import { Router } from "express";
import {
  signup,
  login,
  logout,
  getSession,
} from "../controllers/authController.js";
import validateRequest from "../middlewares/validateRequest.js";
import { protect } from "../middlewares/auth.js";
import { signupSchema, loginSchema } from "../validators/authValidators.js";

const router = Router();

/**
 * Public auth endpoints
 */
router.post("/signup", validateRequest({ body: signupSchema }), signup);
router.post("/login", validateRequest({ body: loginSchema }), login);

/**
 * Protected auth endpoints
 */
router.post("/logout", protect, logout);
router.get("/session", protect, getSession);

export default router;

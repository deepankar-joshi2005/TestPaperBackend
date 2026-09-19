import { Router } from "express";
import {
  getStudentCurrentAffairs,
  getStudentCurrentAffairById,
} from "../controllers/currentAffair.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", requireAuth, getStudentCurrentAffairs);
router.get("/:id", requireAuth, getStudentCurrentAffairById);

export default router;

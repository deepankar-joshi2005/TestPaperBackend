import { Router } from "express";
import {
  getNotesSummary,
  getSubjectsByCategory,
  getNotesBySubject,
} from "../controllers/note.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/summary", requireAuth, getNotesSummary);
router.get("/category/:category", requireAuth, getSubjectsByCategory);
router.get("/subject/:subjectId", requireAuth, getNotesBySubject);

export default router;

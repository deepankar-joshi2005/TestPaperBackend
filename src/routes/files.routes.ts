import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  streamTestQuestionPdf,
  streamAnswerKeyPdf,
  streamNotePdf,
} from "../controllers/files.controller";

const router = Router();

router.get("/test-question/:testId", requireAuth, streamTestQuestionPdf);
router.get("/answer-key/:testId", requireAuth, streamAnswerKeyPdf);
router.get("/note/:noteId", requireAuth, streamNotePdf);

export default router;

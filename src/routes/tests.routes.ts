import { Router } from "express";
import {
  getTestSeriesSummary,
  getSeriesByCategory,
  getTestsBySeries,
  getTestInstructions,
} from "../controllers/tests.controller";
import { getLeaderboard } from "../controllers/leaderboard.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/summary", requireAuth, getTestSeriesSummary);
router.get("/category/:category/series", requireAuth, getSeriesByCategory);
router.get("/series/:seriesId", requireAuth, getTestsBySeries);
router.get("/:testId/instructions", requireAuth, getTestInstructions);
router.get("/:testId/leaderboard", requireAuth, getLeaderboard);

export default router;

import { Router } from "express";
import {
  createCurrentAffair,
  getCurrentAffairs,
  getCurrentAffairDetail,
  updateCurrentAffair,
  deleteCurrentAffair,
} from "../../controllers/admin/currentAffair.controller";

const router = Router();

router.post("/", createCurrentAffair);
router.get("/", getCurrentAffairs);
router.get("/:id", getCurrentAffairDetail);
router.put("/:id", updateCurrentAffair);
router.delete("/:id", deleteCurrentAffair);

export default router;

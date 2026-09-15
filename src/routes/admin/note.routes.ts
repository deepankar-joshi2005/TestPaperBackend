import { Router } from "express";
import {
  createNote,
  getNoteDetail,
  updateNote,
  deleteNote,
} from "../../controllers/admin/note.controller";

const router = Router();

router.post("/", createNote);
router.get("/:id", getNoteDetail);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

export default router;

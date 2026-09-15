import { Router } from "express";
import {
  listNotesSubjects,
  getNotesSubjectDetail,
  getNotesSubjectNotes,
  createNotesSubject,
  updateNotesSubject,
  deleteNotesSubject,
} from "../../controllers/admin/notesSubject.controller";

const router = Router();

router.get("/", listNotesSubjects);
router.get("/:id", getNotesSubjectDetail);
router.get("/:id/notes", getNotesSubjectNotes);
router.post("/", createNotesSubject);
router.put("/:id", updateNotesSubject);
router.delete("/:id", deleteNotesSubject);

export default router;

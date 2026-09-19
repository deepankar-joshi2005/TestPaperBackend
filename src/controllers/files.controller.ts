import fs from "fs";
import path from "path";
import { Response } from "express";
import Test from "../models/test.model";
import Note from "../models/note.model";
import TestSeries from "../models/testSeries.model";
import NotesSubject from "../models/notesSubject.model";
import { AuthRequest } from "../middleware/auth.middleware";
import { hasSeriesAccess, hasNotesAccess } from "../utils/access";

const UPLOADS_DIR = path.join(__dirname, "../../uploads");

// Resolves a stored "/uploads/xxx" path to a real file on disk, refusing to
// serve anything outside UPLOADS_DIR (defends against a tampered/traversal path).
function resolveUploadPath(storedPath: string): string | null {
  const filename = path.basename(storedPath);
  const resolved = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(resolved)) return null;
  return resolved;
}

function sendPdf(res: Response, filePath: string): void {
  res.sendFile(filePath, {
    headers: { "Content-Type": "application/pdf" },
  });
}

export const streamTestQuestionPdf = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;
    const test = await Test.findById(req.params.testId);
    if (!test || !test.questionPdfUrl) {
      res.status(404).json({ message: "Question paper not found" });
      return;
    }
    const series = await TestSeries.findById(test.series);
    if (!series) {
      res.status(404).json({ message: "Test series not found" });
      return;
    }
    const allowed = test.isFreeSample || (await hasSeriesAccess(userId, req.role, series));
    if (!allowed) {
      res.status(403).json({ message: "Please purchase this test series to unlock it." });
      return;
    }
    const filePath = resolveUploadPath(test.questionPdfUrl);
    if (!filePath) {
      res.status(404).json({ message: "File not found" });
      return;
    }
    sendPdf(res, filePath);
  } catch (error) {
    res.status(500).json({ message: "Failed to load question paper", error });
  }
};

export const streamAnswerKeyPdf = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;
    const test = await Test.findById(req.params.testId);
    if (!test || !test.answerKeyUrl) {
      res.status(404).json({ message: "Answer key not found" });
      return;
    }
    const series = await TestSeries.findById(test.series);
    if (!series) {
      res.status(404).json({ message: "Test series not found" });
      return;
    }
    const allowed = test.isFreeSample || (await hasSeriesAccess(userId, req.role, series));
    if (!allowed) {
      res.status(403).json({ message: "Please purchase this test series to unlock it." });
      return;
    }
    const filePath = resolveUploadPath(test.answerKeyUrl);
    if (!filePath) {
      res.status(404).json({ message: "File not found" });
      return;
    }
    if (test.answerKeyType === "image") {
      res.sendFile(filePath);
      return;
    }
    sendPdf(res, filePath);
  } catch (error) {
    res.status(500).json({ message: "Failed to load answer key", error });
  }
};

export const streamNotePdf = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;
    const note = await Note.findById(req.params.noteId);
    if (!note || !note.pdfUrl) {
      res.status(404).json({ message: "Chapter PDF not found" });
      return;
    }
    const subject = await NotesSubject.findById(note.subject);
    if (!subject) {
      res.status(404).json({ message: "Subject not found" });
      return;
    }
    const allowed = note.isFreePreview || (await hasNotesAccess(userId, req.role, subject));
    if (!allowed) {
      res.status(403).json({ message: "Please purchase this subject to unlock this chapter." });
      return;
    }
    const filePath = resolveUploadPath(note.pdfUrl);
    if (!filePath) {
      res.status(404).json({ message: "File not found" });
      return;
    }
    sendPdf(res, filePath);
  } catch (error) {
    res.status(500).json({ message: "Failed to load chapter PDF", error });
  }
};

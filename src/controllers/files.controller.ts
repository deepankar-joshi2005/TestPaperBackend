import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { Response } from "express";
import Test from "../models/test.model";
import Note from "../models/note.model";
import TestSeries from "../models/testSeries.model";
import NotesSubject from "../models/notesSubject.model";
import { AuthRequest } from "../middleware/auth.middleware";
import { hasSeriesAccess, hasNotesAccess } from "../utils/access";

// Fetches a Cloudinary-hosted file and pipes it through our own response so
// the access checks in each handler below stay meaningful — the client only
// ever talks to this endpoint and never sees the underlying Cloudinary URL.
async function streamRemoteFile(res: Response, url: string): Promise<boolean> {
  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) return false;
  const contentType = upstream.headers.get("content-type");
  if (contentType) res.setHeader("Content-Type", contentType);
  await pipeline(Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]), res);
  return true;
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
    const ok = await streamRemoteFile(res, test.questionPdfUrl);
    if (!ok) res.status(404).json({ message: "File not found" });
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
    const ok = await streamRemoteFile(res, test.answerKeyUrl);
    if (!ok) res.status(404).json({ message: "File not found" });
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
    const ok = await streamRemoteFile(res, note.pdfUrl);
    if (!ok) res.status(404).json({ message: "File not found" });
  } catch (error) {
    res.status(500).json({ message: "Failed to load chapter PDF", error });
  }
};

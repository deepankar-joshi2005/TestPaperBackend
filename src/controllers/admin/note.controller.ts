import { Response } from "express";
import Note from "../../models/note.model";
import { AuthRequest } from "../../middleware/auth.middleware";

const ALLOWED_FIELDS = ["title", "description", "pdfUrl", "order", "isActive"] as const;

function pickAllowed(body: Record<string, unknown>) {
  const update: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) update[field] = body[field];
  }
  return update;
}

export const createNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, title, description, pdfUrl, order, isActive } = req.body as {
      subject?: string;
      title?: string;
      description?: string;
      pdfUrl?: string;
      order?: number;
      isActive?: boolean;
    };

    if (!subject) {
      res.status(400).json({ message: "Subject is required" });
      return;
    }
    if (!title || !title.trim()) {
      res.status(400).json({ message: "Chapter title is required" });
      return;
    }
    if (!pdfUrl) {
      res.status(400).json({ message: "Please upload a PDF before saving" });
      return;
    }

    const resolvedOrder = order ?? (await Note.countDocuments({ subject }));
    const note = await Note.create({
      subject,
      title: title.trim(),
      description: description ?? "",
      pdfUrl,
      order: resolvedOrder,
      isActive: isActive ?? true,
    });

    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: "Failed to create chapter", error });
  }
};

export const getNoteDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      res.status(404).json({ message: "Chapter not found" });
      return;
    }
    res.status(200).json(note);
  } catch (error) {
    res.status(500).json({ message: "Failed to load chapter", error });
  }
};

export const updateNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const update = pickAllowed(req.body as Record<string, unknown>);
    const note = await Note.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!note) {
      res.status(404).json({ message: "Chapter not found" });
      return;
    }
    res.status(200).json(note);
  } catch (error) {
    res.status(500).json({ message: "Failed to update chapter", error });
  }
};

export const deleteNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) {
      res.status(404).json({ message: "Chapter not found" });
      return;
    }
    res.status(200).json({ message: "Chapter deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete chapter", error });
  }
};

import { Types } from "mongoose";
import { Response } from "express";
import NotesSubject from "../../models/notesSubject.model";
import Note from "../../models/note.model";
import Purchase from "../../models/purchase.model";
import { AuthRequest } from "../../middleware/auth.middleware";

const ALLOWED_FIELDS = [
  "category",
  "name",
  "description",
  "displayOrder",
  "isActive",
  "accessType",
  "price",
] as const;

function pickAllowed(body: Record<string, unknown>) {
  const update: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) update[field] = body[field];
  }
  return update;
}

async function revenueStats(subjectId: Types.ObjectId | string) {
  const purchases = await Purchase.find({ itemType: "notesSubject", itemId: subjectId });
  return {
    buyerCount: purchases.length,
    revenue: purchases.reduce((sum, p) => sum + p.amount, 0),
  };
}

export const listNotesSubjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category } = req.query as { category?: string };
    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;

    const subjects = await NotesSubject.find(filter).sort({ displayOrder: 1, createdAt: 1 });
    const withCounts = await Promise.all(
      subjects.map(async (s) => ({
        id: s._id,
        category: s.category,
        name: s.name,
        description: s.description,
        displayOrder: s.displayOrder,
        isActive: s.isActive,
        accessType: s.accessType,
        price: s.price,
        noteCount: await Note.countDocuments({ subject: s._id }),
        ...(await revenueStats(s._id)),
      }))
    );

    res.status(200).json(withCounts);
  } catch (error) {
    res.status(500).json({ message: "Failed to load subjects", error });
  }
};

export const getNotesSubjectDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subject = await NotesSubject.findById(req.params.id);
    if (!subject) {
      res.status(404).json({ message: "Subject not found" });
      return;
    }
    const noteCount = await Note.countDocuments({ subject: subject._id });
    res.status(200).json({
      id: subject._id,
      category: subject.category,
      name: subject.name,
      description: subject.description,
      displayOrder: subject.displayOrder,
      isActive: subject.isActive,
      accessType: subject.accessType,
      price: subject.price,
      noteCount,
      ...(await revenueStats(subject._id)),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load subject", error });
  }
};

export const getNotesSubjectNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subject = await NotesSubject.findById(req.params.id);
    if (!subject) {
      res.status(404).json({ message: "Subject not found" });
      return;
    }
    const notes = await Note.find({ subject: subject._id }).sort({ order: 1, createdAt: 1 });
    res.status(200).json({
      subject: { id: subject._id, name: subject.name },
      notes: notes.map((n) => ({
        id: n._id,
        title: n.title,
        description: n.description,
        pdfUrl: n.pdfUrl,
        order: n.order,
        isActive: n.isActive,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load chapters for subject", error });
  }
};

export const createNotesSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, name, description, displayOrder, accessType, price } = req.body as {
      category?: string;
      name?: string;
      description?: string;
      displayOrder?: number;
      accessType?: "free" | "paid";
      price?: number;
    };

    if (!name || !name.trim()) {
      res.status(400).json({ message: "Subject name is required" });
      return;
    }
    if (!category) {
      res.status(400).json({ message: "Category is required" });
      return;
    }

    const subject = await NotesSubject.create({
      category,
      name: name.trim(),
      description: description ?? "",
      displayOrder: displayOrder ?? 0,
      accessType: accessType ?? "free",
      price: accessType === "paid" ? price ?? 0 : 0,
    });

    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ message: "Failed to create subject", error });
  }
};

export const updateNotesSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const update = pickAllowed(req.body as Record<string, unknown>);
    const subject = await NotesSubject.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!subject) {
      res.status(404).json({ message: "Subject not found" });
      return;
    }
    res.status(200).json(subject);
  } catch (error) {
    res.status(500).json({ message: "Failed to update subject", error });
  }
};

export const deleteNotesSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subject = await NotesSubject.findByIdAndDelete(req.params.id);
    if (!subject) {
      res.status(404).json({ message: "Subject not found" });
      return;
    }
    await Note.deleteMany({ subject: subject._id });
    res.status(200).json({ message: "Subject deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete subject", error });
  }
};

import { Response } from "express";
import NotesSubject from "../models/notesSubject.model";
import Note from "../models/note.model";
import Category from "../models/category.model";
import { AuthRequest } from "../middleware/auth.middleware";

export const getNotesSummary = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const activeCategories = await Category.find({ isActive: true }).sort({ displayOrder: 1 });

    const summary = await Promise.all(
      activeCategories.map(async (cat) => {
        const subjectCount = await NotesSubject.countDocuments({
          category: cat.name,
          isActive: true,
        });
        return {
          category: cat.name,
          iconImage: cat.iconImage,
          subjectCount,
        };
      })
    );

    res.status(200).json(summary.filter((s) => s.subjectCount > 0));
  } catch (error) {
    res.status(500).json({ message: "Failed to load notes summary", error });
  }
};

export const getSubjectsByCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const category = req.params.category;

    const categoryDoc = await Category.findOne({ name: category, isActive: true });
    if (!categoryDoc) {
      res.status(404).json({ message: "Unknown category" });
      return;
    }

    const subjects = await NotesSubject.find({ category, isActive: true }).sort({
      displayOrder: 1,
    });

    const withCounts = await Promise.all(
      subjects.map(async (s) => ({
        id: s._id,
        name: s.name,
        description: s.description,
        noteCount: await Note.countDocuments({ subject: s._id, isActive: true }),
      }))
    );

    res.status(200).json({ category, subjects: withCounts });
  } catch (error) {
    res.status(500).json({ message: "Failed to load subjects", error });
  }
};

export const getNotesBySubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subject = await NotesSubject.findOne({
      _id: req.params.subjectId,
      isActive: true,
    });
    if (!subject) {
      res.status(404).json({ message: "Subject not found" });
      return;
    }

    const notes = await Note.find({ subject: subject._id, isActive: true }).sort({ order: 1 });

    res.status(200).json({
      subject: { id: subject._id, name: subject.name },
      category: subject.category,
      notes: notes.map((n) => ({
        id: n._id,
        title: n.title,
        description: n.description,
        pdfUrl: n.pdfUrl,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load chapters", error });
  }
};

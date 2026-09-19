import { Response } from "express";
import NotesSubject from "../models/notesSubject.model";
import Note from "../models/note.model";
import Category from "../models/category.model";
import { AuthRequest } from "../middleware/auth.middleware";
import { hasNotesAccess } from "../utils/access";
import Purchase from "../models/purchase.model";

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
    const userId = req.userId as string;
    const isAdmin = req.role === "admin";
    const category = req.params.category;

    const categoryDoc = await Category.findOne({ name: category, isActive: true });
    if (!categoryDoc) {
      res.status(404).json({ message: "Unknown category" });
      return;
    }

    const subjects = await NotesSubject.find({ category, isActive: true }).sort({
      displayOrder: 1,
    });

    const purchases = await Purchase.find({
      user: userId,
      itemType: "notesSubject",
      itemId: { $in: subjects.map((s) => s._id) },
    });
    const purchasedSet = new Set(purchases.map((p) => String(p.itemId)));

    const withCounts = await Promise.all(
      subjects.map(async (s) => {
        const isPurchased = purchasedSet.has(String(s._id));
        return {
          id: s._id,
          name: s.name,
          description: s.description,
          noteCount: await Note.countDocuments({ subject: s._id, isActive: true }),
          freePreviewCount: await Note.countDocuments({
            subject: s._id,
            isActive: true,
            isFreePreview: true,
          }),
          accessType: s.accessType,
          price: s.price,
          isLocked: !isAdmin && s.accessType === "paid" && !isPurchased,
          isPurchased: isAdmin || isPurchased,
        };
      })
    );

    res.status(200).json({ category, subjects: withCounts });
  } catch (error) {
    res.status(500).json({ message: "Failed to load subjects", error });
  }
};

export const getNotesBySubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;
    const subject = await NotesSubject.findOne({
      _id: req.params.subjectId,
      isActive: true,
    });
    if (!subject) {
      res.status(404).json({ message: "Subject not found" });
      return;
    }

    const unlocked = await hasNotesAccess(userId, req.role, subject);
    const notes = await Note.find({ subject: subject._id, isActive: true }).sort({ order: 1 });

    res.status(200).json({
      subject: {
        id: subject._id,
        name: subject.name,
        accessType: subject.accessType,
        price: subject.price,
        isLocked: !unlocked,
      },
      category: subject.category,
      notes: notes.map((n) => {
        const canOpen = unlocked || n.isFreePreview;
        return {
          id: n._id,
          title: n.title,
          description: n.description,
          pdfUrl: canOpen && n.pdfUrl ? `/api/files/note/${n._id}` : null,
          isFreePreview: n.isFreePreview,
          isLocked: !canOpen,
        };
      }),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load chapters", error });
  }
};

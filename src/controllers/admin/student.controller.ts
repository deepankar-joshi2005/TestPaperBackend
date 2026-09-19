import { Response } from "express";
import User from "../../models/user.model";
import TestAttempt from "../../models/testAttempt.model";
import Purchase from "../../models/purchase.model";
import TestSeries from "../../models/testSeries.model";
import NotesSubject from "../../models/notesSubject.model";
import { AuthRequest } from "../../middleware/auth.middleware";

export const listStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search } = req.query as { search?: string };
    const filter: Record<string, unknown> = { role: "student" };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }

    const students = await User.find(filter).sort({ createdAt: -1 }).limit(200);
    const withStats = await Promise.all(
      students.map(async (student) => {
        const attempts = await TestAttempt.find({ user: student._id, status: "completed" });
        const attemptCount = attempts.length;
        const avgScore = attemptCount
          ? Math.round(
              attempts.reduce((sum, a) => sum + (a.scorePercent ?? 0), 0) / attemptCount
            )
          : 0;

        return {
          id: student._id,
          name: student.name,
          email: student.email,
          mobile: student.mobile,
          joinedAt: student.createdAt,
          attemptCount,
          avgScore,
        };
      })
    );

    res.status(200).json(withStats);
  } catch (error) {
    res.status(500).json({ message: "Failed to load students", error });
  }
};

export const getStudentDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: "student" });
    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    const attempts = await TestAttempt.find({ user: student._id }).sort({ startedAt: -1 });
    const purchases = await Purchase.find({ user: student._id }).sort({ purchasedAt: -1 });

    const seriesTitles = new Map(
      (
        await TestSeries.find({
          _id: { $in: purchases.filter((p) => p.itemType === "series").map((p) => p.itemId) },
        })
      ).map((s) => [String(s._id), s.title])
    );
    const subjectNames = new Map(
      (
        await NotesSubject.find({
          _id: {
            $in: purchases.filter((p) => p.itemType === "notesSubject").map((p) => p.itemId),
          },
        })
      ).map((s) => [String(s._id), s.name])
    );

    res.status(200).json({
      id: student._id,
      name: student.name,
      email: student.email,
      mobile: student.mobile,
      joinedAt: student.createdAt,
      attempts: attempts.map((a) => ({
        attemptId: a._id,
        title: a.title,
        status: a.status,
        score: a.score,
        scorePercent: a.scorePercent,
        submittedAt: a.submittedAt,
      })),
      purchases: purchases.map((p) => ({
        itemType: p.itemType,
        itemTitle:
          p.itemType === "series"
            ? seriesTitles.get(String(p.itemId)) ?? "Deleted series"
            : subjectNames.get(String(p.itemId)) ?? "Deleted subject",
        amount: p.amount,
        purchasedAt: p.purchasedAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load student", error });
  }
};

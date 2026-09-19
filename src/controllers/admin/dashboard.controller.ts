import { Response } from "express";
import User from "../../models/user.model";
import TestSeries from "../../models/testSeries.model";
import Test from "../../models/test.model";
import Question from "../../models/question.model";
import TestAttempt from "../../models/testAttempt.model";
import Purchase from "../../models/purchase.model";
import { AuthRequest } from "../../middleware/auth.middleware";

export const getAdminDashboard = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalStudents,
      totalSeries,
      totalTests,
      totalQuestions,
      todaysAttempts,
      todaysNewStudents,
      recentTests,
      recentPublishedSeries,
      allPurchases,
      todaysPurchases,
    ] = await Promise.all([
      User.countDocuments({ role: "student" }),
      TestSeries.countDocuments({}),
      Test.countDocuments({}),
      Question.countDocuments({}),
      TestAttempt.countDocuments({ startedAt: { $gte: startOfToday } }),
      User.countDocuments({ role: "student", createdAt: { $gte: startOfToday } }),
      Test.find().sort({ createdAt: -1 }).limit(5),
      TestSeries.find({ status: "published" }).sort({ publishedAt: -1 }).limit(5),
      Purchase.find(),
      Purchase.find({ purchasedAt: { $gte: startOfToday } }),
    ]);

    const totalRevenue = allPurchases.reduce((sum, p) => sum + p.amount, 0);
    const todaysRevenue = todaysPurchases.reduce((sum, p) => sum + p.amount, 0);
    const totalPayingStudents = new Set(allPurchases.map((p) => String(p.user))).size;

    const recentActivity = [
      ...recentTests.map((t) => ({
        id: String(t._id),
        type: "test" as const,
        title: t.title,
        meta: `${t.totalQuestions} Questions`,
        status: t.status,
        date: t.createdAt,
      })),
      ...recentPublishedSeries.map((s) => ({
        id: String(s._id),
        type: "series" as const,
        title: s.title,
        meta: s.category,
        status: s.status,
        date: s.publishedAt ?? s.createdAt,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 6);

    res.status(200).json({
      metrics: {
        totalStudents,
        totalSeries,
        totalTests,
        totalQuestions,
        todaysAttempts,
        todaysNewStudents,
        totalRevenue,
        todaysRevenue,
        totalPayingStudents,
      },
      recentActivity,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load admin dashboard", error });
  }
};

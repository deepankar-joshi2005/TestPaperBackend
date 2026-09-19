import { Response } from "express";
import Purchase from "../../models/purchase.model";
import User from "../../models/user.model";
import TestSeries from "../../models/testSeries.model";
import NotesSubject from "../../models/notesSubject.model";
import { AuthRequest } from "../../middleware/auth.middleware";

async function attachLabels(purchases: InstanceType<typeof Purchase>[]) {
  const userIds = purchases.map((p) => p.user);
  const seriesIds = purchases.filter((p) => p.itemType === "series").map((p) => p.itemId);
  const subjectIds = purchases.filter((p) => p.itemType === "notesSubject").map((p) => p.itemId);

  const [users, series, subjects] = await Promise.all([
    User.find({ _id: { $in: userIds } }),
    TestSeries.find({ _id: { $in: seriesIds } }),
    NotesSubject.find({ _id: { $in: subjectIds } }),
  ]);

  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const seriesMap = new Map(series.map((s) => [String(s._id), s.title]));
  const subjectMap = new Map(subjects.map((s) => [String(s._id), s.name]));

  return purchases.map((p) => {
    const user = userMap.get(String(p.user));
    return {
      id: p._id,
      studentId: p.user,
      studentName: user?.name ?? "Unknown",
      studentEmail: user?.email ?? "",
      itemType: p.itemType,
      itemId: p.itemId,
      itemTitle:
        p.itemType === "series"
          ? seriesMap.get(String(p.itemId)) ?? "Deleted series"
          : subjectMap.get(String(p.itemId)) ?? "Deleted subject",
      amount: p.amount,
      purchasedAt: p.purchasedAt,
    };
  });
}

export const listPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { itemType, from, to } = req.query as {
      itemType?: string;
      from?: string;
      to?: string;
    };

    const filter: Record<string, unknown> = {};
    if (itemType === "series" || itemType === "notesSubject") filter.itemType = itemType;
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = new Date(from);
      if (to) range.$lte = new Date(to);
      filter.purchasedAt = range;
    }

    const purchases = await Purchase.find(filter).sort({ purchasedAt: -1 }).limit(500);
    res.status(200).json(await attachLabels(purchases));
  } catch (error) {
    res.status(500).json({ message: "Failed to load payments", error });
  }
};

export const getPaymentsSummary = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

    const allPurchases = await Purchase.find();
    const totalRevenue = allPurchases.reduce((sum, p) => sum + p.amount, 0);
    const todaysRevenue = allPurchases
      .filter((p) => p.purchasedAt >= startOfToday)
      .reduce((sum, p) => sum + p.amount, 0);
    const thisMonthRevenue = allPurchases
      .filter((p) => p.purchasedAt >= startOfMonth)
      .reduce((sum, p) => sum + p.amount, 0);
    const totalPayingStudents = new Set(allPurchases.map((p) => String(p.user))).size;

    const bySeries = new Map<string, { revenue: number; buyerCount: number }>();
    const bySubject = new Map<string, { revenue: number; buyerCount: number }>();
    for (const p of allPurchases) {
      const bucket = p.itemType === "series" ? bySeries : bySubject;
      const key = String(p.itemId);
      const entry = bucket.get(key) ?? { revenue: 0, buyerCount: 0 };
      entry.revenue += p.amount;
      entry.buyerCount += 1;
      bucket.set(key, entry);
    }

    const [seriesTitles, subjectNames] = await Promise.all([
      TestSeries.find({ _id: { $in: Array.from(bySeries.keys()) } }),
      NotesSubject.find({ _id: { $in: Array.from(bySubject.keys()) } }),
    ]);
    const seriesTitleMap = new Map(seriesTitles.map((s) => [String(s._id), s.title]));
    const subjectNameMap = new Map(subjectNames.map((s) => [String(s._id), s.name]));

    const topSeries = Array.from(bySeries.entries())
      .map(([id, stats]) => ({ id, title: seriesTitleMap.get(id) ?? "Deleted series", ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    const topNotesSubjects = Array.from(bySubject.entries())
      .map(([id, stats]) => ({
        id,
        title: subjectNameMap.get(id) ?? "Deleted subject",
        ...stats,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    res.status(200).json({
      totalRevenue,
      todaysRevenue,
      thisMonthRevenue,
      totalPayingStudents,
      totalPurchases: allPurchases.length,
      topSeries,
      topNotesSubjects,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load payments summary", error });
  }
};

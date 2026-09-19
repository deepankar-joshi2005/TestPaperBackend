import { Response } from "express";
import CurrentAffair, { CurrentAffairType, CurrentAffairPeriod } from "../../models/currentAffair.model";
import { AuthRequest } from "../../middleware/auth.middleware";
import { notifyAllStudents } from "../notification.controller";

const TYPE_LABELS: Record<CurrentAffairType, string> = {
  national: "National",
  uttarakhand: "Uttarakhand",
  international: "International",
};

const PERIOD_LABELS: Record<CurrentAffairPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  half_yearly: "6 Months",
  yearly: "Yearly",
};

export const createCurrentAffair = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      type,
      period,
      pdfUrl,
      year,
      month,
      week,
      isActive = true,
      notifyStudents = true,
    } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ message: "Title is required" });
      return;
    }

    if (!type || !["national", "uttarakhand", "international"].includes(type)) {
      res.status(400).json({ message: "Valid type (national, uttarakhand, international) is required" });
      return;
    }

    if (!period || !["weekly", "monthly", "half_yearly", "yearly"].includes(period)) {
      res.status(400).json({ message: "Valid period (weekly, monthly, half_yearly, yearly) is required" });
      return;
    }

    if (!pdfUrl) {
      res.status(400).json({ message: "PDF document is required" });
      return;
    }

    const currentAffair = await CurrentAffair.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      type,
      period,
      pdfUrl,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      week: week ? Number(week) : undefined,
      isActive: Boolean(isActive),
    });

    if (notifyStudents && isActive) {
      const typeLabel = TYPE_LABELS[type as CurrentAffairType] || type;
      const periodLabel = PERIOD_LABELS[period as CurrentAffairPeriod] || period;
      notifyAllStudents(
        `📢 New ${periodLabel} Current Affairs (${typeLabel})`,
        `"${title.trim()}" is now available. Tap to read the latest PDF digest!`,
        "system",
        { targetScreen: "affairs" }
      ).catch((err) => console.error("Failed to broadcast notification:", err));
    }

    res.status(201).json(currentAffair);
  } catch (error) {
    res.status(500).json({ message: "Failed to create current affairs", error });
  }
};

export const getCurrentAffairs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, period, search } = req.query;

    const filter: Record<string, unknown> = {};

    if (type && type !== "all") {
      filter.type = type;
    }

    if (period && period !== "all") {
      filter.period = period;
    }

    if (search && typeof search === "string" && search.trim()) {
      filter.title = { $regex: search.trim(), $options: "i" };
    }

    const items = await CurrentAffair.find(filter).sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch current affairs", error });
  }
};

export const getCurrentAffairDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await CurrentAffair.findById(req.params.id);
    if (!item) {
      res.status(404).json({ message: "Current affairs not found" });
      return;
    }
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch current affairs detail", error });
  }
};

export const updateCurrentAffair = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, type, period, pdfUrl, year, month, week, isActive } = req.body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (type !== undefined) updateData.type = type;
    if (period !== undefined) updateData.period = period;
    if (pdfUrl !== undefined) updateData.pdfUrl = pdfUrl;
    if (year !== undefined) updateData.year = year ? Number(year) : null;
    if (month !== undefined) updateData.month = month ? Number(month) : null;
    if (week !== undefined) updateData.week = week ? Number(week) : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await CurrentAffair.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) {
      res.status(404).json({ message: "Current affairs not found" });
      return;
    }
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update current affairs", error });
  }
};

export const deleteCurrentAffair = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deleted = await CurrentAffair.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: "Current affairs not found" });
      return;
    }
    res.status(200).json({ message: "Current affairs deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete current affairs", error });
  }
};

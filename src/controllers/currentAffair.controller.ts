import { Response } from "express";
import CurrentAffair from "../models/currentAffair.model";
import { AuthRequest } from "../middleware/auth.middleware";

export const getStudentCurrentAffairs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, period, search } = req.query;

    const filter: Record<string, unknown> = { isActive: true };

    if (type && type !== "all") {
      filter.type = type;
    }

    if (period && period !== "all") {
      filter.period = period;
    }

    if (search && typeof search === "string" && search.trim()) {
      filter.title = { $regex: search.trim(), $options: "i" };
    }

    const [items, counts] = await Promise.all([
      CurrentAffair.find(filter).sort({ createdAt: -1 }),
      CurrentAffair.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const typeCounts: Record<string, number> = {
      national: 0,
      uttarakhand: 0,
      international: 0,
      total: 0,
    };

    counts.forEach((c) => {
      if (c._id && typeCounts[c._id] !== undefined) {
        typeCounts[c._id] = c.count;
      }
      typeCounts.total += c.count;
    });

    res.status(200).json({
      items,
      typeCounts,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch current affairs", error });
  }
};

export const getStudentCurrentAffairById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await CurrentAffair.findOne({ _id: req.params.id, isActive: true });
    if (!item) {
      res.status(404).json({ message: "Current affairs not found" });
      return;
    }
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch current affairs detail", error });
  }
};

import { Types } from "mongoose";
import Purchase from "../models/purchase.model";
import { Role } from "../models/user.model";
import { PurchasableItemType } from "../models/order.model";

type AccessTypeField = { accessType: "free" | "paid" };

export const isPurchased = async (
  userId: string,
  itemType: PurchasableItemType,
  itemId: Types.ObjectId | string
): Promise<boolean> => {
  const existing = await Purchase.exists({ user: userId, itemType, itemId });
  return !!existing;
};

export const hasSeriesAccess = async (
  userId: string,
  role: Role | undefined,
  series: AccessTypeField & { _id: Types.ObjectId | string }
): Promise<boolean> => {
  if (role === "admin") return true;
  if (series.accessType === "free") return true;
  return isPurchased(userId, "series", series._id);
};

export const hasNotesAccess = async (
  userId: string,
  role: Role | undefined,
  subject: AccessTypeField & { _id: Types.ObjectId | string }
): Promise<boolean> => {
  if (role === "admin") return true;
  if (subject.accessType === "free") return true;
  return isPurchased(userId, "notesSubject", subject._id);
};

export type DateWindowStatus = "open" | "upcoming" | "expired";

// Admins always see "open" so they can preview/QA content before it goes
// live or after its window has closed, without the scheduling gate in the way.
export const getDateWindowStatus = (
  startDate: Date | null | undefined,
  endDate: Date | null | undefined,
  role?: Role,
  now: Date = new Date()
): DateWindowStatus => {
  if (role === "admin") return "open";
  if (startDate && now < startDate) return "upcoming";
  if (endDate && now > endDate) return "expired";
  return "open";
};

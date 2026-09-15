import { Response } from "express";
import Notification from "../models/notification.model";
import User from "../models/user.model";
import { AuthRequest } from "../middleware/auth.middleware";

export const notifyAllStudents = async (title: string, message: string): Promise<void> => {
  const students = await User.find({ role: "student" }, { _id: 1 });
  if (students.length === 0) return;
  await Notification.insertMany(
    students.map((s) => ({
      user: s._id,
      type: "system" as const,
      title,
      message,
    }))
  );
};

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ user: userId, isRead: false }),
    ]);

    res.status(200).json({
      unreadCount,
      notifications: notifications.map((n) => ({
        id: n._id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load notifications", error });
  }
};

export const markNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;
    const { notificationId } = req.params;
    await Notification.updateOne({ _id: notificationId, user: userId }, { isRead: true });
    res.status(200).json({ message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notification", error });
  }
};

export const markAllNotificationsRead = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId as string;
    await Notification.updateMany({ user: userId, isRead: false }, { isRead: true });
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notifications", error });
  }
};

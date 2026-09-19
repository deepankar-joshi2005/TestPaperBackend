import crypto from "crypto";
import Razorpay from "razorpay";
import { Request, Response } from "express";
import Order from "../models/order.model";
import Purchase from "../models/purchase.model";
import TestSeries from "../models/testSeries.model";
import NotesSubject from "../models/notesSubject.model";
import { AuthRequest } from "../middleware/auth.middleware";
import { razorpay, getRazorpayKeyId, getRazorpayWebhookSecret } from "../config/razorpay";
import { isPurchased } from "../utils/access";

type ItemType = "series" | "notesSubject";

// Razorpay's checkout flow signs `${order_id}|${payment_id}` with HMAC-SHA256
// using the account's key secret. Recomputing it server-side (the secret never
// reaches the client) is what makes a forged /verify call impossible.
function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

async function loadPurchasableItem(itemType: ItemType, itemId: string) {
  if (itemType === "series") return TestSeries.findById(itemId);
  if (itemType === "notesSubject") return NotesSubject.findById(itemId);
  return null;
}

async function markOrderPaid(order: InstanceType<typeof Order>): Promise<void> {
  if (order.status !== "paid") {
    order.status = "paid";
    await order.save();
  }
  try {
    await Purchase.findOneAndUpdate(
      { user: order.user, itemType: order.itemType, itemId: order.itemId },
      {
        $setOnInsert: {
          user: order.user,
          itemType: order.itemType,
          itemId: order.itemId,
          amount: order.amount,
          order: order._id,
          purchasedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    // Duplicate-key race from a concurrent verify + webhook hitting at the same
    // instant is expected and harmless — the purchase already exists either way.
    if ((error as { code?: number }).code !== 11000) throw error;
  }
}

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;
    const { itemType, itemId } = req.body as { itemType?: ItemType; itemId?: string };

    if (itemType !== "series" && itemType !== "notesSubject") {
      res.status(400).json({ message: "itemType must be 'series' or 'notesSubject'" });
      return;
    }
    if (!itemId) {
      res.status(400).json({ message: "itemId is required" });
      return;
    }

    const item = await loadPurchasableItem(itemType, itemId);
    if (!item) {
      res.status(404).json({ message: "Item not found" });
      return;
    }
    if (item.accessType !== "paid" || !item.price || item.price <= 0) {
      res.status(400).json({ message: "This item is not purchasable" });
      return;
    }

    const alreadyOwned = await isPurchased(userId, itemType, item._id);
    if (alreadyOwned) {
      res.status(400).json({ message: "You already own this" });
      return;
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(item.price * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { itemType, itemId: String(item._id), userId },
    });

    await Order.create({
      user: userId,
      itemType,
      itemId: item._id,
      razorpayOrderId: razorpayOrder.id,
      amount: item.price,
      currency: "INR",
      status: "created",
    });

    res.status(201).json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: getRazorpayKeyId(),
      itemTitle: "title" in item ? item.title : item.name,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create payment order", error });
  }
};

export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ message: "Missing payment verification fields" });
      return;
    }

    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id, user: userId });
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      order.status = "failed";
      await order.save();
      res.status(400).json({ message: "Payment verification failed" });
      return;
    }

    await markOrderPaid(order);

    res.status(200).json({ success: true, itemType: order.itemType, itemId: order.itemId });
  } catch (error) {
    res.status(500).json({ message: "Failed to verify payment", error });
  }
};

export const razorpayWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    const rawBody = (req.body as Buffer).toString();
    const webhookSecret = getRazorpayWebhookSecret();

    if (!signature || !webhookSecret) {
      res.status(400).json({ message: "Webhook not configured" });
      return;
    }

    const isValid = Razorpay.validateWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      res.status(400).json({ message: "Invalid webhook signature" });
      return;
    }

    const payload = JSON.parse(rawBody) as {
      event?: string;
      payload?: { payment?: { entity?: { order_id?: string } } };
    };

    if (payload.event === "payment.captured" || payload.event === "order.paid") {
      const razorpayOrderId = payload.payload?.payment?.entity?.order_id;
      if (razorpayOrderId) {
        const order = await Order.findOne({ razorpayOrderId });
        if (order) await markOrderPaid(order);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    res.status(500).json({ message: "Webhook processing failed", error });
  }
};

export const getMyPurchases = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const purchases = await Purchase.find({ user: req.userId });
    res.status(200).json(
      purchases.map((p) => ({
        itemType: p.itemType,
        itemId: p.itemId,
        purchasedAt: p.purchasedAt,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: "Failed to load purchases", error });
  }
};

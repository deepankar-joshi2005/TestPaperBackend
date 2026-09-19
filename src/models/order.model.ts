import mongoose, { Schema, Document, Types } from "mongoose";

export type PurchasableItemType = "series" | "notesSubject";
export type OrderStatus = "created" | "paid" | "failed";

export interface IOrder extends Document {
  user: Types.ObjectId;
  itemType: PurchasableItemType;
  itemId: Types.ObjectId;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  createdAt: Date;
}

const orderSchema = new Schema<IOrder>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  itemType: { type: String, enum: ["series", "notesSubject"], required: true },
  itemId: { type: Schema.Types.ObjectId, required: true },
  razorpayOrderId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  status: { type: String, enum: ["created", "paid", "failed"], default: "created" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IOrder>("Order", orderSchema);

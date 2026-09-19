import mongoose, { Schema, Document, Types } from "mongoose";
import { PurchasableItemType } from "./order.model";

export interface IPurchase extends Document {
  user: Types.ObjectId;
  itemType: PurchasableItemType;
  itemId: Types.ObjectId;
  amount: number;
  order: Types.ObjectId;
  purchasedAt: Date;
}

const purchaseSchema = new Schema<IPurchase>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  itemType: { type: String, enum: ["series", "notesSubject"], required: true },
  itemId: { type: Schema.Types.ObjectId, required: true, index: true },
  amount: { type: Number, required: true },
  order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
  purchasedAt: { type: Date, default: Date.now },
});

purchaseSchema.index({ user: 1, itemType: 1, itemId: 1 }, { unique: true });

export default mongoose.model<IPurchase>("Purchase", purchaseSchema);

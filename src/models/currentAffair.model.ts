import mongoose, { Schema, Document } from "mongoose";

export type CurrentAffairType = "national" | "uttarakhand" | "international";
export type CurrentAffairPeriod = "weekly" | "monthly" | "half_yearly" | "yearly";

export interface ICurrentAffair extends Document {
  title: string;
  description?: string;
  type: CurrentAffairType;
  period: CurrentAffairPeriod;
  pdfUrl: string;
  year?: number;
  month?: number;
  week?: number;
  isActive: boolean;
  createdAt: Date;
}

const currentAffairSchema = new Schema<ICurrentAffair>({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "", trim: true },
  type: {
    type: String,
    enum: ["national", "uttarakhand", "international"],
    required: true,
    index: true,
  },
  period: {
    type: String,
    enum: ["weekly", "monthly", "half_yearly", "yearly"],
    required: true,
    index: true,
  },
  pdfUrl: { type: String, required: true },
  year: { type: Number },
  month: { type: Number },
  week: { type: Number },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now, index: true },
});

export default mongoose.model<ICurrentAffair>("CurrentAffair", currentAffairSchema);

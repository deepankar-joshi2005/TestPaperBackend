import mongoose, { Schema, Document, Types } from "mongoose";

export interface INote extends Document {
  subject: Types.ObjectId;
  title: string;
  description: string;
  pdfUrl: string | null;
  order: number;
  isActive: boolean;
  isFreePreview: boolean;
  createdAt: Date;
}

const noteSchema = new Schema<INote>({
  subject: { type: Schema.Types.ObjectId, ref: "NotesSubject", required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "", trim: true },
  pdfUrl: { type: String, default: null },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isFreePreview: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<INote>("Note", noteSchema);

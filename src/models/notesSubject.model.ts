import mongoose, { Schema, Document } from "mongoose";

export type NotesAccessType = "free" | "paid";

export interface INotesSubject extends Document {
  category: string;
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
  accessType: NotesAccessType;
  price: number;
  createdAt: Date;
}

const notesSubjectSchema = new Schema<INotesSubject>({
  category: { type: String, required: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "", trim: true },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  accessType: { type: String, enum: ["free", "paid"], default: "free" },
  price: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<INotesSubject>("NotesSubject", notesSubjectSchema);

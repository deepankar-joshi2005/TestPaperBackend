import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { uploadBuffer } from "../../config/cloudinary";

export const uploadFile = async (req: AuthRequest, res: Response): Promise<void> => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    res.status(400).json({ message: "No file was uploaded" });
    return;
  }
  try {
    const result = await uploadBuffer(file.buffer);
    res.status(201).json({ url: result.secure_url });
  } catch (error) {
    res.status(500).json({
      message: "Failed to upload file",
      error: error instanceof Error ? error.message : error,
    });
  }
};

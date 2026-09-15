import { Router } from "express";
import { uploadFile } from "../../controllers/admin/upload.controller";
import { uploadDocument, uploadImage } from "../../middleware/upload.middleware";

const router = Router();

router.post("/", uploadImage.single("file"), uploadFile);
router.post("/document", uploadDocument.single("file"), uploadFile);

export default router;

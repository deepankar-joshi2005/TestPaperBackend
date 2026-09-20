import multer from "multer";

// Files are held in memory only long enough to hand their buffer to
// Cloudinary (see admin/upload.controller.ts) — nothing is written to local
// disk, which on Render (and similar PaaS hosts) is wiped on every deploy
// or restart.
const memoryStorage = multer.memoryStorage();

export const uploadImage = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const uploadDocument = multer({
  storage: memoryStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf" && !file.mimetype.startsWith("image/")) {
      cb(new Error("Only PDF or image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const uploadImport = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/csv",
    ];
    if (!allowed.includes(file.mimetype) && !/\.(xlsx|xls|csv)$/i.test(file.originalname)) {
      cb(new Error("Only .xlsx, .xls, or .csv files are allowed"));
      return;
    }
    cb(null, true);
  },
});

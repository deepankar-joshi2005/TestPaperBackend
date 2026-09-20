import dotenv from "dotenv";
// Loaded first so .env is available to the rest of the app as early as
// possible. Note: under `tsx` (esbuild) in dev, import statements can still
// get hoisted above this call, so any module that truly needs an env var
// correct at startup must still read process.env lazily (inside a function),
// not into a top-level const — see config/db.ts and config/razorpay.ts.
dotenv.config();

import express, { Application, Request, Response } from "express";
import cors from "cors";
import connectDB from "./config/db";
import testPaperRoutes from "./routes/testPaper.routes";
import authRoutes from "./routes/auth.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import testsRoutes from "./routes/tests.routes";
import notesRoutes from "./routes/notes.routes";
import attemptsRoutes from "./routes/attempts.routes";
import performanceRoutes from "./routes/performance.routes";
import profileRoutes from "./routes/profile.routes";
import notificationsRoutes from "./routes/notifications.routes";
import supportRoutes from "./routes/support.routes";
import adminRoutes from "./routes/admin";
import currentAffairRoutes from "./routes/currentAffair.routes";
import paymentRoutes from "./routes/payment.routes";
import filesRoutes from "./routes/files.routes";
import { razorpayWebhook } from "./controllers/payment.controller";

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// Razorpay's webhook signature is verified over the exact raw request body,
// so this route needs express.raw() instead of the JSON parser below — it
// must be registered before app.use(express.json()) to see the raw bytes.
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), razorpayWebhook);

app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Backend is running" });
});

app.use("/api/test-papers", testPaperRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/tests", testsRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/attempts", attemptsRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/current-affairs", currentAffairRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/files", filesRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
